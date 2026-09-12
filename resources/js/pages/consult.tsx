import { Mic, SendHorizontal, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useEcho } from '@laravel/echo-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ConsentGate from '@/components/consent-gate';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import ConsultationController from '@/actions/App/Http/Controllers/Consult/ConsultationController';
import { GeminiLiveClient } from '@/lib/gemini-live';
import { LiveMic, LiveSpeaker } from '@/lib/live-audio';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type CoughAnalysis = {
    risk_level?: string;
    findings?: string;
    recommendation?: string;
} | null;
type AnemiaPart = 'palm' | 'eye' | 'nail';
type AnemiaAnalysis = {
    part?: string;
    risk_level?: string;
    risk_score?: number | null;
    prediction?: string;
    findings?: string;
    recommendation?: string;
} | null;
type Capture = {
    id: number;
    type: string;
    path: string;
    mime_type?: string;
    analysis?: AnemiaAnalysis;
    risk_level?: string | null;
} | null;

const ANEMIA_PARTS: AnemiaPart[] = ['palm', 'eye', 'nail'];
const ANEMIA_CUE =
    /ready to capture[\s\S]*?\b(palm|eye|eyelid|fingernail|nail)\b/i;

function normalizeAnemiaPart(raw: string): AnemiaPart {
    if (raw === 'eyelid') return 'eye';
    if (raw === 'fingernail') return 'nail';

    return raw as AnemiaPart;
}

export default function Consult({
    consultation,
    messages = [],
    captures = [],
}: {
    consultation: {
        id: number;
        status: string;
        cough_analysis: CoughAnalysis;
        cough_risk?: string | null;
        consented_at?: string | null;
    };
    messages?: ChatMessage[];
    captures?: Array<{
        id: number;
        type: string;
        path: string;
        mime_type?: string;
        analysis?: AnemiaAnalysis;
        risk_level?: string | null;
    }>;
}) {
    const [chat, setChat] = useState<ChatMessage[]>(messages);
    const [message, setMessage] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [analysis, setAnalysis] = useState<CoughAnalysis>(
        consultation.cough_analysis,
    );
    const [recordingCough, setRecordingCough] = useState(false);
    const [awaitingCough, setAwaitingCough] = useState(false);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [cameraOn, setCameraOn] = useState(false);
    const [consented, setConsented] = useState(
        Boolean(consultation.consented_at),
    );
    const [consentOpen, setConsentOpen] = useState(false);
    const [coughRisk, setCoughRisk] = useState<string | null>(
        consultation.cough_risk ?? null,
    );
    const [analysisPending, setAnalysisPending] = useState(false);
    const [anemia, setAnemia] = useState<Record<AnemiaPart, AnemiaAnalysis>>(
        () => {
            const initial: Record<AnemiaPart, AnemiaAnalysis> = {
                palm: null,
                eye: null,
                nail: null,
            };

            captures.forEach((capture) => {
                if (
                    (capture.type === 'palm' ||
                        capture.type === 'eye' ||
                        capture.type === 'nail') &&
                    capture.analysis
                ) {
                    initial[capture.type] = capture.analysis;
                }
            });

            return initial;
        },
    );
    const [anemiaPending, setAnemiaPending] = useState<
        Record<AnemiaPart, boolean>
    >({
        palm: false,
        eye: false,
        nail: false,
    });

    // Live-voice channel state: the transcript shows what is happening.
    const [connected, setConnected] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [assistantLive, setAssistantLive] = useState('');
    const [userLive, setUserLive] = useState('');
    const [voiceHint, setVoiceHint] = useState(
        'Tap to start the voice consult',
    );
    const [useFallbackLoop, setUseFallbackLoop] = useState(false);

    const chatRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);

    const liveRef = useRef<GeminiLiveClient | null>(null);
    const micRef = useRef<LiveMic | null>(null);
    const speakerRef = useRef<LiveSpeaker | null>(null);
    const lastAssistantFinalRef = useRef('');
    const coughStartedRef = useRef(false);
    const anemiaCueRef = useRef('');
    const anemiaInFlightRef = useRef<AnemiaPart | null>(null);
    const sessionTurnsRef = useRef<
        Array<{ role: 'user' | 'assistant'; text: string }>
    >([]);
    const sessionIdRef = useRef<string>('');

    useEcho<{
        consultation_id: number;
        risk_level?: string;
        cough_risk?: string | null;
        cough_analysis?: CoughAnalysis;
    }>(
        `consultation.${consultation.id}`,
        'cough.analysis',
        (payload) => {
            if (payload.cough_analysis) {
                setAnalysis(payload.cough_analysis);
            }

            setCoughRisk(payload.cough_risk ?? payload.risk_level ?? null);
            setAnalysisPending(false);
            setAwaitingCough(false);

            const live = liveRef.current;

            if (live?.isReady()) {
                const risk = payload.risk_level ?? 'unclear';
                const findings =
                    payload.cough_analysis?.findings ?? 'not available';

                live.sendText(
                    `The cough sample was recorded and analysed. Risk level: ${risk}. Findings: ${findings}. Comment on this and continue the pre-visit conversation with the patient.`,
                );
                void restartLiveMic();
            }
        },
        [consultation.id],
    );

    useEcho<{
        consultation_id: number;
        part?: AnemiaPart;
        risk_level?: string;
        anemia_analysis?: AnemiaAnalysis;
    }>(
        `consultation.${consultation.id}`,
        'anemia.analysis',
        (payload) => {
            const part = payload.part;

            if (!part) return;

            if (payload.anemia_analysis) {
                setAnemia((prev) => ({
                    ...prev,
                    [part]: payload.anemia_analysis ?? null,
                }));
            }

            setAnemiaPending((prev) => ({ ...prev, [part]: false }));
            anemiaInFlightRef.current = null;
            anemiaCueRef.current = '';

            const live = liveRef.current;

            if (live?.isReady()) {
                const risk = payload.risk_level ?? 'unclear';
                const findings =
                    payload.anemia_analysis?.findings ?? 'not available';

                live.sendText(
                    `The ${part} anemia screening image was analysed. Risk level: ${risk}. Findings: ${findings}. Comment on this briefly, then offer the next anemia check or continue the pre-visit conversation.`,
                );
            }
        },
        [consultation.id],
    );

    useEffect(() => {
        chatRef.current?.scrollTo({
            top: chatRef.current.scrollHeight,
        });
    }, [chat, assistantLive, userLive]);

    useEffect(
        () => () => {
            liveRef.current?.disconnect();
            liveRef.current = null;
            micRef.current?.stop();
            micRef.current = null;
            speakerRef.current?.reset();
            speakerRef.current = null;
            mediaStreamRef.current
                ?.getTracks()
                .forEach((track) => track.stop());
            mediaStreamRef.current = null;
        },
        [],
    );

    function handleAssistantCue(said: string) {
        if (
            !coughStartedRef.current &&
            said.toLowerCase().includes('ready to record')
        ) {
            setVoiceHint('Cough toward the microphone twice now');
            coughStartedRef.current = true;
        }

        const anemiaMatch = said.match(ANEMIA_CUE);

        if (anemiaMatch && !anemiaInFlightRef.current) {
            const part = normalizeAnemiaPart(anemiaMatch[1].toLowerCase());
            const cueKey = `${part}:${said}`;

            if (anemiaCueRef.current !== cueKey) {
                anemiaCueRef.current = cueKey;
                setVoiceHint(
                    `Capturing your ${part} — hold still in the camera`,
                );
                window.setTimeout(() => {
                    void captureAnemia(part);
                }, 1800);
            }
        }
    }

    function clearLiveTranscript() {
        setAssistantLive('');
        setUserLive('');
    }

    /** Persist the running transcript for the doctor's review console. */
    async function saveSessionLog(ended: boolean): Promise<void> {
        if (sessionTurnsRef.current.length === 0 && !ended) return;

        try {
            await fetch(
                ConsultationController.sessionLog.url(consultation.id),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({
                        session_id: sessionIdRef.current,
                        turns: sessionTurnsRef.current,
                        ended: ended,
                    }),
                },
            );
        } catch (error) {
            console.error('Could not save session log', error);
        }
    }

    async function startVoiceConsult() {
        setSessionStarted(true);

        if (!cameraOn) {
            void toggleCamera();
        }

        try {
            const response = await fetch(
                ConsultationController.liveToken.url(consultation.id),
                { headers: { 'X-Requested-With': 'XMLHttpRequest' } },
            );

            if (!response.ok) {
                throw new Error('token failed');
            }

            const setup = (await response.json()) as {
                token: string;
                model: string;
                system_instruction: string;
            };

            sessionTurnsRef.current = [];
            sessionIdRef.current = `live-${Date.now().toString(36)}-${consultation.id}`;

            const speaker = new LiveSpeaker();
            speakerRef.current = speaker;

            const live = new GeminiLiveClient({
                setup,
                onOpen: () => {
                    setConnected(true);
                    setVoiceHint('Listening — just speak naturally');
                    void startLiveMic(live);
                },
                onUserTranscript: (text, isFinal) => {
                    setUserLive(text);

                    if (isFinal && text.trim().length > 0) {
                        sessionTurnsRef.current.push({
                            role: 'user',
                            text: text.trim(),
                        });
                        setChat((prev) => [
                            ...prev,
                            { role: 'user', content: text.trim() },
                        ]);
                        setUserLive('');
                    }
                },
                onAssistantTranscript: (text, isFinal) => {
                    setAssistantLive(text);
                    setGenerating(true);

                    const final = text.trim();

                    if (
                        isFinal &&
                        final.length > 0 &&
                        final !== lastAssistantFinalRef.current
                    ) {
                        lastAssistantFinalRef.current = final;
                        sessionTurnsRef.current.push({
                            role: 'assistant',
                            text: final,
                        });
                        setChat((prev) => [
                            ...prev,
                            { role: 'assistant', content: final },
                        ]);
                        setAssistantLive('');
                        setGenerating(false);
                        handleAssistantCue(final);
                    }
                },
                onAudioChunk: (chunk) => {
                    setSpeaking(true);
                    void speaker.enqueue(chunk);
                },
                onInterrupted: () => {
                    speaker.interrupt();
                    setSpeaking(false);
                },
                onTurnComplete: () => {
                    setGenerating(false);
                    setSpeaking(false);
                },
                onError: (error) => {
                    console.error('Live session error', error);
                    void saveSessionLog(true);
                    teardownLiveSession();
                    setUseFallbackLoop(true);
                    setVoiceHint(
                        'Live voice unavailable — using turn-based voice',
                    );
                },
                onClose: () => {
                    setConnected(false);
                    void saveSessionLog(true);
                    setVoiceHint('Voice session ended — tap to restart');
                },
            });

            liveRef.current = live;
            live.connect();
        } catch (error) {
            console.error('Could not start Live session', error);
            setUseFallbackLoop(true);
            setVoiceHint('Live voice unavailable — using turn-based voice');
        }
    }

    async function startLiveMic(live: GeminiLiveClient) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: 16000, channelCount: 1 },
            });
            mediaStreamRef.current = stream;
            micRef.current = new LiveMic();
            micRef.current.start(stream, live);
        } catch (error) {
            console.error('Microphone access error', error);
            setVoiceHint('Microphone needed — check browser permissions');
        }
    }

    function teardownLiveSession() {
        micRef.current?.stop();
        micRef.current = null;
        speakerRef.current?.reset();
        speakerRef.current = null;
        liveRef.current?.disconnect();
        liveRef.current = null;
        mediaStreamRef.current?.getTracks().forEach((track) => {
            if (track.kind === 'audio') track.stop();
        });
        setConnected(false);
        setSpeaking(false);
        setGenerating(false);
        clearLiveTranscript();
    }

    async function send(text: string) {
        if (!text.trim() || streaming) return;

        setMessage('');
        setChat((prev) => [...prev, { role: 'user', content: text }]);

        if (connected && liveRef.current?.isReady()) {
            liveRef.current.sendText(text.trim());
            setGenerating(true);
            return;
        }

        const response = await fetch(
            ConsultationController.chat.url(consultation.id),
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'text/event-stream',
                },
                body: JSON.stringify({
                    message: text,
                    new_session: !sessionStarted,
                }),
            },
        );

        if (!response.ok) {
            console.error('Chat request failed');
            setStreaming(false);
            return;
        }

        setStreaming(true);
        setChat((prev) => [...prev, { role: 'assistant', content: '' }]);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (reader) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                const payload = line.replace(/^data: /, '');
                try {
                    const event = JSON.parse(payload);
                    if (event.type === 'delta') {
                        setChat((prev) => {
                            const copy = [...prev];
                            copy[copy.length - 1] = {
                                role: 'assistant',
                                content:
                                    copy[copy.length - 1].content +
                                    (event.delta ?? ''),
                            };
                            return copy;
                        });
                    }
                    if (event.type === 'done') {
                        setStreaming(false);
                    }
                } catch {
                    console.warn('Parse error for chunk', payload);
                }
            }
        }
        setStreaming(false);
    }

    async function toggleCamera() {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
            if (videoRef.current) videoRef.current.srcObject = null;
            setCameraOn(false);
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            mediaStreamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            setCameraOn(true);
        } catch (error) {
            console.error('Camera/Microphone access error', error);
            setCameraOn(false);
        }
    }

    async function startCough() {
        micRef.current?.stop();
        micRef.current = null;

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
        setRecordingCough(true);

        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = (event) => {
            chunks.push(event.data);
        };

        recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: recorder.mimeType });
            stream.getTracks().forEach((track) => track.stop());
            setRecordingCough(false);
            await analyzeCough(blob);
        };

        recorder.start();
        setTimeout(() => {
            if (recorderRef.current?.state === 'recording') {
                recorder.stop();
            }
        }, 4000);
    }

    async function restartLiveMic() {
        const live = liveRef.current;
        if (!live?.isReady()) return;

        const stream = mediaStreamRef.current;
        if (!stream || stream.getAudioTracks().length === 0) return;

        micRef.current = new LiveMic();
        micRef.current.start(stream, live);
    }

    async function analyzeCough(blob: Blob): Promise<void> {
        setAnalysisPending(true);

        try {
            const formData = new FormData();
            formData.append('audio', blob, 'cough.webm');
            const response = await fetch(
                ConsultationController.cough.url(consultation.id),
                {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: formData,
                },
            );

            if (!response.ok) {
                throw new Error('Cough upload failed');
            }

            setAwaitingCough(false);
        } catch (error) {
            console.error('Could not send the cough sample', error);
            setAnalysisPending(false);
        }
    }

    async function capturePhoto() {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png'),
        );
        if (!blob) return;

        const formData = new FormData();
        formData.append('type', 'photo');
        formData.append('media', blob, 'capture.png');

        await fetch(ConsultationController.capture.url(consultation.id), {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: formData,
        });
    }

    async function captureAnemia(part: AnemiaPart): Promise<void> {
        const video = videoRef.current;

        if (!video || video.videoWidth === 0) {
            anemiaCueRef.current = '';
            setVoiceHint(
                'Start the camera so Sage can screen your anemia risk',
            );
            return;
        }

        if (anemiaInFlightRef.current) return;

        anemiaInFlightRef.current = part;
        setAnemiaPending((prev) => ({ ...prev, [part]: true }));

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png'),
        );

        if (!blob) {
            anemiaInFlightRef.current = null;
            anemiaCueRef.current = '';
            setAnemiaPending((prev) => ({ ...prev, [part]: false }));
            return;
        }

        const formData = new FormData();
        formData.append('part', part);
        formData.append('image', blob, `${part}.png`);

        try {
            const response = await fetch(
                ConsultationController.anemia.url(consultation.id),
                {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: formData,
                },
            );

            if (!response.ok) {
                throw new Error('anemia upload failed');
            }
        } catch (error) {
            console.error('Could not send the anemia capture', error);
            anemiaInFlightRef.current = null;
            anemiaCueRef.current = '';
            setAnemiaPending((prev) => ({ ...prev, [part]: false }));
        }
    }

    return (
        <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-3">
            {consentOpen && (
                <ConsentGate
                    consultationId={consultation.id}
                    onConsented={() => {
                        setConsented(true);
                        setConsentOpen(false);
                        void startVoiceConsult();
                    }}
                />
            )}
            <div className="relative col-span-1 flex flex-col overflow-hidden rounded-xl border bg-black lg:col-span-2">
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full flex-1 object-cover"
                />

                <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
                    <Heading title="Pre-Visit Consult" />
                    <div className="flex items-center gap-2">
                        {speaking && (
                            <Badge className="animate-pulse bg-black/50 text-white">
                                talking…
                            </Badge>
                        )}
                        {generating && (
                            <Badge className="bg-black/50 text-white">
                                generating…
                            </Badge>
                        )}
                        {connected && !speaking && !generating && (
                            <Badge className="bg-primary/80 text-white">
                                listening
                            </Badge>
                        )}
                    </div>
                    <Badge className="bg-black/50 text-white">
                        {cameraOn ? 'camera live' : 'camera off'}
                    </Badge>
                </div>

                <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <Button variant="outline" size="sm" onClick={toggleCamera}>
                        {cameraOn ? 'Stop Camera' : 'Start Camera'}
                    </Button>
                    {cameraOn && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void capturePhoto()}
                        >
                            Save Photo
                        </Button>
                    )}
                    {awaitingCough && !recordingCough && (
                        <Button size="sm" onClick={() => void startCough()}>
                            Record & Send Cough
                        </Button>
                    )}
                    {sessionStarted && voiceHint && (
                        <span className="text-xs text-white/80">
                            {voiceHint}
                        </span>
                    )}
                    {captures.length > 0 && (
                        <span className="ml-auto text-xs text-white/80">
                            {captures.length} capture
                            {captures.length === 1 ? '' : 's'} saved for the
                            doctor
                        </span>
                    )}
                </div>

                {!sessionStarted && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
                        <p className="max-w-sm text-center text-sm text-white">
                            Sage, your voice assistant, will greet you live —
                            like a real conversation. Tap to start, mics on.
                        </p>
                        <Button
                            className="size-12"
                            onClick={() => {
                                if (consented) {
                                    void startVoiceConsult();
                                } else {
                                    setConsentOpen(true);
                                }
                            }}
                            size="lg"
                        >
                            <Mic className="size-5" />
                            Start Voice Consult
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleCamera}
                            className="bg-black/40"
                        >
                            <Video className="size-4" />
                            Start Camera
                        </Button>
                    </div>
                )}
            </div>

            <div className="col-span-1 flex flex-col gap-4 overflow-y-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Transcript</CardTitle>
                        <p className="text-sm text-neutral-500">
                            {speaking
                                ? 'Sage is speaking… (talk over it to interrupt)'
                                : generating
                                  ? 'Generating reply…'
                                  : connected
                                    ? 'Listening… turn-taking is automatic'
                                    : useFallbackLoop
                                      ? 'Turn-based voice mode — speak or type to reply'
                                      : 'Not connected'}
                        </p>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col">
                        <div
                            ref={chatRef}
                            className="flex max-h-72 flex-1 flex-col gap-2 overflow-y-auto"
                        >
                            {chat.length === 0 &&
                                !assistantLive &&
                                !userLive && (
                                    <p className="text-sm text-neutral-500">
                                        The conversation transcript appears
                                        here, word by word as it is spoken.
                                    </p>
                                )}
                            {chat.map((msg, i) => (
                                <div
                                    key={i}
                                    className={
                                        msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground max-w-[95%] self-end rounded-lg px-3 py-2 text-sm'
                                            : 'bg-muted max-w-[95%] self-start rounded-lg px-3 py-2 text-sm'
                                    }
                                >
                                    {msg.content}
                                </div>
                            ))}
                            {userLive && (
                                <div className="bg-primary/40 text-primary-foreground max-w-[95%] self-end rounded-lg px-3 py-2 text-sm italic">
                                    {userLive}
                                </div>
                            )}
                            {speaking && (
                                <div className="flex items-center gap-1 self-start px-2 py-1">
                                    <span className="bg-muted size-2 animate-bounce rounded-full" />
                                    <span className="animate-bounce-1 bg-muted size-2 rounded-full" />
                                    <span className="animate-bounce-2 bg-muted size-2 rounded-full" />
                                </div>
                            )}
                            {assistantLive && (
                                <div className="bg-muted max-w-[95%] self-start rounded-lg px-3 py-2 text-sm">
                                    {assistantLive}
                                </div>
                            )}
                        </div>

                        <form
                            onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                                e.preventDefault();
                                void send(message);
                                setMessage('');
                            }}
                            className="mt-3 flex gap-2"
                        >
                            <textarea
                                value={message}
                                onChange={(
                                    e: React.ChangeEvent<HTMLTextAreaElement>,
                                ) => setMessage(e.target.value)}
                                placeholder="Type here — replies stream the same way…"
                                disabled={streaming}
                                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex-1 resize-none rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                rows={2}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                className="self-end"
                                disabled={streaming || !message.trim()}
                                aria-label="Send message"
                            >
                                <SendHorizontal className="size-4" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card
                    className={
                        awaitingCough && !recordingCough
                            ? 'ring-primary ring-4'
                            : undefined
                    }
                >
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Cough Assessment
                            {analysisPending ? (
                                <Badge variant="secondary">analysing…</Badge>
                            ) : (
                                coughRisk && (
                                    <Badge
                                        variant={
                                            coughRisk === 'high'
                                                ? 'destructive'
                                                : 'secondary'
                                        }
                                    >
                                        {coughRisk}
                                    </Badge>
                                )
                            )}
                        </CardTitle>
                    </CardHeader>

                    {analysisPending && (
                        <CardContent className="text-sm text-neutral-500">
                            The cough sample is being analysed. This page
                            updates automatically.
                        </CardContent>
                    )}

                    {analysis && !analysisPending && (
                        <CardContent className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
                            <p>
                                <span className="font-medium">Findings:</span>{' '}
                                {analysis.findings}
                            </p>
                            <p>
                                <span className="font-medium">
                                    Recommendation:
                                </span>{' '}
                                {analysis.recommendation}
                            </p>
                            <p className="text-xs italic">
                                This is not a diagnosis. Please see a doctor for
                                a clinical assessment.
                            </p>
                        </CardContent>
                    )}
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Anemia Screening
                            <Badge variant={cameraOn ? 'secondary' : 'outline'}>
                                {cameraOn ? 'camera ready' : 'camera off'}
                            </Badge>
                        </CardTitle>
                        <p className="text-sm text-neutral-500">
                            Sage asks you to show your palm, lower eyelid and
                            fingernail. The camera captures each image
                            automatically when she is ready. You can also
                            capture manually.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        {ANEMIA_PARTS.map((part) => {
                            const result = anemia[part];
                            const pending = anemiaPending[part];
                            const positive = result?.risk_level === 'high';

                            return (
                                <div
                                    key={part}
                                    className="rounded-lg border p-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium capitalize">
                                            {part === 'eye'
                                                ? 'Lower eyelid'
                                                : part === 'nail'
                                                  ? 'Fingernail'
                                                  : 'Palm'}
                                        </span>
                                        {pending ? (
                                            <Badge variant="secondary">
                                                analysing…
                                            </Badge>
                                        ) : (
                                            result?.risk_level && (
                                                <Badge
                                                    variant={
                                                        positive
                                                            ? 'destructive'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {positive
                                                        ? 'screen positive'
                                                        : 'screen negative'}
                                                </Badge>
                                            )
                                        )}
                                    </div>

                                    {result?.findings && !pending && (
                                        <p className="mt-1 text-neutral-600 dark:text-neutral-300">
                                            {result.findings}
                                        </p>
                                    )}

                                    {result?.risk_score != null && !pending && (
                                        <p className="mt-1 text-xs text-neutral-500">
                                            Score{' '}
                                            {Number(result.risk_score).toFixed(
                                                3,
                                            )}
                                        </p>
                                    )}

                                    <Button
                                        className="mt-2"
                                        size="sm"
                                        variant="outline"
                                        disabled={!cameraOn || pending}
                                        onClick={() => void captureAnemia(part)}
                                    >
                                        Capture {part}
                                    </Button>
                                </div>
                            );
                        })}
                        <p className="text-xs italic">
                            Screening only — anaemia is confirmed with a blood
                            test.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Cough Sample</CardTitle>
                        <p className="text-sm text-neutral-500">
                            {awaitingCough && !recordingCough
                                ? 'Sage is ready — cough toward the microphone twice now.'
                                : 'Tap record, wait 4 seconds and cough toward the microphone twice.'}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full"
                            onClick={() => void startCough()}
                            disabled={recordingCough}
                        >
                            <Mic
                                className={
                                    recordingCough
                                        ? 'size-4 animate-pulse'
                                        : 'size-4'
                                }
                            />
                            {recordingCough
                                ? 'Recording…'
                                : 'Record & Send Cough'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

Consult.layout = {
    breadcrumbs: [
        {
            title: 'Consult',
        },
    ],
};

export type { CoughAnalysis, ChatMessage, Capture, AnemiaAnalysis, AnemiaPart };
