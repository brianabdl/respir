import { LoaderCircle, Mic, SendHorizontal, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useEcho } from '@laravel/echo-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ConsentGate from '@/components/consent-gate';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import ConsultationController from '@/actions/App/Http/Controllers/Consult/ConsultationController';
import { GeminiLiveClient, type LiveTool } from '@/lib/gemini-live';
import { LiveMic, LiveSpeaker } from '@/lib/live-audio';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type CoughAnalysis = {
    risk_level?: string;
    risk_score?: number | null;
    findings?: string;
    recommendation?: string;
    duration_s?: number;
    model?: {
        name?: string;
        version?: string;
        available?: boolean;
    };
} | null;
type CoughPhase =
    | 'idle'
    | 'prompted'
    | 'recording'
    | 'processing'
    | 'complete'
    | 'error';
type Capture = {
    id: number;
    type: string;
    path: string;
    mime_type?: string;
} | null;

// Band cutoffs mirror TbClassifier in ai-service (HIGH 0.66, MEDIUM 0.33).
const RISK_BAND_CUTOFFS = { medium: 0.33, high: 0.66 } as const;

const COUGH_CAPTURE_TOOL: LiveTool = {
    functionDeclarations: [
        {
            name: 'start_cough_capture',
            description:
                'Starts the cough sample recording: the patient hears a cue and coughs twice toward the microphone. Recording lasts four seconds and stops automatically. Call this exactly once when it is time for the cough sample; do not ask the patient to record manually.',
            parameters: { type: 'object', properties: {} },
        },
    ],
};

const RISK_MEANINGS: Record<string, string> = {
    low: 'No concerning acoustic pattern was detected in this sample. This does not rule out illness — please keep your appointment and mention any symptoms.',
    medium: 'This sample shows an acoustic pattern that deserves a closer look. This is not a diagnosis — a clinician needs to assess you in person.',
    high: 'This sample shows a strong acoustic pattern that needs prompt in-person assessment. Please see a doctor soon. This is still not a diagnosis.',
    unclear:
        'This sample could not be assessed — it may have been too short, too noisy, or the analysis model was unavailable.',
};

const RISK_MARKER_STYLES: Record<string, string> = {
    low: 'bg-emerald-500',
    medium: 'bg-amber-500',
    high: 'bg-red-500',
    unclear: 'bg-neutral-400',
};

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
    }>;
}) {
    const [chat, setChat] = useState<ChatMessage[]>(messages);
    const [message, setMessage] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [analysis, setAnalysis] = useState<CoughAnalysis>(
        consultation.cough_analysis,
    );
    const [coughPhase, setCoughPhase] = useState<CoughPhase>(
        consultation.cough_analysis ? 'complete' : 'idle',
    );
    const [sessionStarted, setSessionStarted] = useState(false);
    const [cameraOn, setCameraOn] = useState(false);
    const [consented, setConsented] = useState(
        Boolean(consultation.consented_at),
    );
    const [consentOpen, setConsentOpen] = useState(false);
    const [coughRisk, setCoughRisk] = useState<string | null>(
        consultation.cough_risk ?? null,
    );
    const [micLevel, setMicLevel] = useState(0);
    const [quietSample, setQuietSample] = useState(false);

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
    const assistantBufferRef = useRef('');
    const assistantPlaybackTokenRef = useRef(0);
    const coughStartedRef = useRef(false);
    const coughTimerRef = useRef<number | null>(null);
    const sessionTurnsRef = useRef<
        Array<{ role: 'user' | 'assistant'; text: string }>
    >([]);
    const sessionIdRef = useRef<string>('');
    const meterRef = useRef<{
        context: AudioContext;
        analyser: AnalyserNode;
        timer: number;
        peak: number;
    } | null>(null);

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
            setCoughPhase('complete');
            setVoiceHint('Cough sample analysed — session ended');
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
            stopMeter();
            speakerRef.current?.reset();
            speakerRef.current = null;
            mediaStreamRef.current
                ?.getTracks()
                .forEach((track) => track.stop());
            mediaStreamRef.current = null;
            if (coughTimerRef.current !== null) {
                window.clearTimeout(coughTimerRef.current);
                coughTimerRef.current = null;
            }
        },
        [],
    );

    function handleAssistantCue(said: string) {
        const normalized = said.toLowerCase();
        const requestsCoughSample = normalized.includes('microphone');

        if (!coughStartedRef.current && requestsCoughSample) {
            setCoughPhase('prompted');
            setVoiceHint('Get ready — recording your cough sample next');
            coughStartedRef.current = true;
            micRef.current?.stop();
            micRef.current = null;
            speakerRef.current?.interrupt();
            coughTimerRef.current = window.setTimeout(() => {
                coughTimerRef.current = null;
                void startCough();
            }, 900);
        }
    }

    function clearLiveTranscript() {
        assistantBufferRef.current = '';
        setAssistantLive('');
        setUserLive('');
    }

    function resetCoughAssessment(): void {
        setAnalysis(null);
        setCoughRisk(null);
        setCoughPhase('idle');
        coughStartedRef.current = false;
        if (coughTimerRef.current !== null) {
            window.clearTimeout(coughTimerRef.current);
            coughTimerRef.current = null;
        }
    }

    async function finishAssistantTurn(
        said: string,
        speaker: LiveSpeaker,
        token: number,
    ): Promise<void> {
        // Gemini can signal turn completion before queued PCM finishes playing.
        // Wait for playback so cough and camera cues never interrupt Sage.
        await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 100);
        });

        const deadline = Date.now() + 15_000;

        while (speaker.isSpeaking() && Date.now() < deadline) {
            await new Promise<void>((resolve) => {
                window.setTimeout(resolve, 50);
            });
        }

        if (token !== assistantPlaybackTokenRef.current) return;

        setSpeaking(false);
        handleAssistantCue(said);
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
        resetCoughAssessment();
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
                language_code?: string;
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
                onAssistantTranscript: (text) => {
                    assistantBufferRef.current += text;
                    setAssistantLive(assistantBufferRef.current);
                    setGenerating(true);
                },
                onAudioChunk: (chunk) => {
                    setSpeaking(true);
                    void speaker.enqueue(chunk);
                },
                onInterrupted: () => {
                    assistantPlaybackTokenRef.current += 1;
                    speaker.interrupt();
                    setSpeaking(false);
                },
                onTurnComplete: () => {
                    setGenerating(false);
                    const playbackToken = ++assistantPlaybackTokenRef.current;

                    const said = assistantBufferRef.current.trim();

                    if (said.length > 0) {
                        sessionTurnsRef.current.push({
                            role: 'assistant',
                            text: said,
                        });
                        setChat((prev) => [
                            ...prev,
                            { role: 'assistant', content: said },
                        ]);
                        void finishAssistantTurn(said, speaker, playbackToken);
                    } else {
                        setSpeaking(false);
                    }

                    assistantBufferRef.current = '';
                    setAssistantLive('');
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
                    assistantPlaybackTokenRef.current += 1;
                    setConnected(false);
                    void saveSessionLog(true);
                    setVoiceHint('Voice session ended — tap to restart');
                },
                tools: [COUGH_CAPTURE_TOOL],
                onFunctionCall: (name) => handleToolCall(name),
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
        assistantPlaybackTokenRef.current += 1;
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
        let reply = '';

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
                        reply += event.delta ?? '';
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
                        handleAssistantCue(reply);
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

    function stopMeter(): number {
        const meter = meterRef.current;
        meterRef.current = null;

        if (!meter) {
            return 1;
        }

        window.clearInterval(meter.timer);
        void meter.context.close().catch(() => undefined);

        return meter.peak;
    }

    function startMeter(stream: MediaStream): void {
        // Best-effort input level indicator only; recording works without it.
        try {
            const Context =
                window.AudioContext ??
                (
                    window as unknown as {
                        webkitAudioContext?: typeof AudioContext;
                    }
                ).webkitAudioContext;

            if (!Context) {
                return;
            }

            const context = new Context();
            const analyser = context.createAnalyser();
            analyser.fftSize = 2048;
            context.createMediaStreamSource(stream).connect(analyser);
            const samples = new Uint8Array(analyser.fftSize);
            const meter = { context, analyser, timer: 0, peak: 0 };
            meter.timer = window.setInterval(() => {
                analyser.getByteTimeDomainData(samples);
                let max = 0;

                for (let i = 0; i < samples.length; i++) {
                    const value = Math.abs(samples[i] - 128) / 128;

                    if (value > max) {
                        max = value;
                    }
                }

                meter.peak = Math.max(meter.peak, max);
                setMicLevel(max);
            }, 120);
            meterRef.current = meter;
        } catch (error) {
            console.error('Could not start input level meter', error);
        }
    }

    function wait(ms: number): Promise<void> {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    async function startCough() {
        if (coughPhase === 'recording' || coughPhase === 'processing') return;

        coughStartedRef.current = true;

        if (coughTimerRef.current !== null) {
            window.clearTimeout(coughTimerRef.current);
            coughTimerRef.current = null;
        }

        micRef.current?.stop();
        micRef.current = null;

        let stream: MediaStream;

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
        } catch (error) {
            console.error('Cough microphone access error', error);
            setCoughPhase('error');
            setVoiceHint('Microphone access failed — try recording again');
            return;
        }

        setCoughPhase('recording');
        setVoiceHint('Recording — cough twice toward the microphone');

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';
        let recorder: MediaRecorder;

        try {
            recorder = new MediaRecorder(stream, { mimeType });
        } catch (error) {
            console.error('Could not start cough recorder', error);
            stream.getTracks().forEach((track) => track.stop());
            setCoughPhase('error');
            setVoiceHint('This browser cannot record audio — try again');
            return;
        }

        recorderRef.current = recorder;
        const chunks: BlobPart[] = [];

        recorder.onerror = () => {
            stream.getTracks().forEach((track) => track.stop());
            recorderRef.current = null;
            stopMeter();
            setMicLevel(0);
            setCoughPhase('error');
            setVoiceHint('Recording failed — try the cough sample again');
        };

        recorder.ondataavailable = (event) => {
            chunks.push(event.data);
        };

        recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: recorder.mimeType });
            stream.getTracks().forEach((track) => track.stop());
            recorderRef.current = null;
            const peak = stopMeter();
            setMicLevel(0);
            setQuietSample(peak < 0.02);
            setCoughPhase('processing');
            setVoiceHint('Sample received — analysing securely');
            await analyzeCough(blob);
        };

        recorder.start();
        setMicLevel(0);
        setQuietSample(false);
        startMeter(stream);
        coughTimerRef.current = window.setTimeout(() => {
            coughTimerRef.current = null;
            if (recorderRef.current?.state === 'recording') {
                recorder.stop();
            }
        }, 4000);
    }

    async function analyzeCough(blob: Blob): Promise<void> {
        try {
            const formData = new FormData();
            formData.append('audio', blob, 'cough.webm');
            const response = await fetch(
                ConsultationController.cough.url(consultation.id),
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: formData,
                },
            );

            if (!response.ok) {
                const details = (await response.text()).slice(0, 500);
                throw new Error(
                    `Cough upload failed (${response.status})${details ? `: ${details}` : ''}`,
                );
            }

            // Cough capture completes this voice session. Analysis remains async
            // and arrives through the Echo event above.
            teardownLiveSession();
            setVoiceHint('Cough sample received — session ended');
        } catch (error) {
            console.error('Could not send the cough sample', error);
            setCoughPhase('error');
            setVoiceHint('Could not send cough sample — try again');
        }
    }

    async function handleToolCall(
        name: string,
    ): Promise<Record<string, unknown>> {
        if (name !== 'start_cough_capture') {
            return { status: 'unsupported' };
        }

        if (coughPhase === 'recording' || coughPhase === 'processing') {
            return { status: 'already_recording' };
        }

        coughStartedRef.current = true;
        setCoughPhase('prompted');
        setVoiceHint('Get ready — recording your cough sample next');
        micRef.current?.stop();
        micRef.current = null;
        speakerRef.current?.interrupt();

        await wait(900);
        await startCough();

        const recorder = recorderRef.current;

        if (recorder) {
            await new Promise<void>((resolve) => {
                const original = recorder.onstop;
                recorder.onstop = (event) => {
                    original?.call(recorder, event);
                    resolve();
                };
            });
        }

        return { status: 'recording_started', duration_s: 4 };
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

    const awaitingCough = coughPhase === 'prompted';
    const recordingCough = coughPhase === 'recording';
    const analysisPending = coughPhase === 'processing';
    const showingPreviousAssessment =
        !sessionStarted && Boolean(consultation.cough_analysis);

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

                {(awaitingCough || recordingCough) && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
                        <div className="flex flex-col items-center gap-4 text-center text-white">
                            <div
                                className={`relative flex size-28 items-center justify-center rounded-full border-2 ${recordingCough ? 'border-red-400 bg-red-500/20' : 'border-white/70 bg-white/10'}`}
                            >
                                {recordingCough && (
                                    <>
                                        <span className="absolute inset-0 animate-ping rounded-full border border-red-300/70" />
                                        <span className="absolute inset-2 animate-pulse rounded-full bg-red-400/20" />
                                    </>
                                )}
                                <Mic
                                    className={`relative size-10 ${recordingCough ? 'text-red-200' : 'text-white'}`}
                                />
                            </div>
                            <div>
                                <p className="text-lg font-semibold">
                                    {recordingCough
                                        ? 'Recording cough sample'
                                        : 'Get ready to cough'}
                                </p>
                                <p className="mt-1 text-sm text-white/80">
                                    {recordingCough
                                        ? 'Cough twice toward the microphone'
                                        : 'Recording starts automatically'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

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
                    {(coughPhase === 'idle' || coughPhase === 'error') && (
                        <Button size="sm" onClick={() => void startCough()}>
                            <Mic className="size-4" />
                            {coughPhase === 'error'
                                ? 'Try Cough Again'
                                : 'Record Cough'}
                        </Button>
                    )}
                    {analysisPending && (
                        <span className="flex items-center gap-2 text-xs text-white/80">
                            <LoaderCircle className="size-3 animate-spin" />
                            Analysing sample securely
                        </span>
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
                        awaitingCough || recordingCough
                            ? 'ring-primary ring-4'
                            : undefined
                    }
                >
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Cough Assessment
                            {analysisPending ? (
                                <Badge variant="secondary">analysing…</Badge>
                            ) : coughPhase === 'error' ? (
                                <Badge variant="destructive">
                                    retry needed
                                </Badge>
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
                        {showingPreviousAssessment && (
                            <p className="text-sm text-neutral-500">
                                Previous session result. Start a new voice
                                consult to record a fresh sample.
                            </p>
                        )}
                    </CardHeader>

                    {analysisPending && (
                        <CardContent className="text-sm text-neutral-500">
                            The cough sample is being analysed. This usually
                            takes under a minute. This page updates
                            automatically.
                        </CardContent>
                    )}

                    {analysis && !analysisPending && (
                        <CardContent className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
                            {typeof analysis.risk_score === 'number' &&
                                analysis.risk_level !== 'unclear' && (
                                    <div>
                                        <div
                                            className="relative flex h-2 overflow-visible rounded-full"
                                            role="img"
                                            aria-label={`Estimated risk score ${Math.round(Math.min(100, Math.max(0, analysis.risk_score * 100)))} out of 100, ${analysis.risk_level} band`}
                                        >
                                            <div
                                                className="rounded-l-full bg-emerald-500/25"
                                                style={{
                                                    width: `${RISK_BAND_CUTOFFS.medium * 100}%`,
                                                }}
                                            />
                                            <div
                                                className="bg-amber-500/35"
                                                style={{
                                                    width: `${(RISK_BAND_CUTOFFS.high - RISK_BAND_CUTOFFS.medium) * 100}%`,
                                                }}
                                            />
                                            <div className="flex-1 rounded-r-full bg-red-500/35" />
                                            <div
                                                className={`absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow dark:border-neutral-900 ${RISK_MARKER_STYLES[analysis.risk_level ?? 'unclear'] ?? 'bg-neutral-400'}`}
                                                style={{
                                                    left: `${Math.min(100, Math.max(0, analysis.risk_score * 100))}%`,
                                                }}
                                            />
                                        </div>
                                        <div className="mt-1 flex text-xs text-neutral-500">
                                            <span
                                                style={{
                                                    width: `${RISK_BAND_CUTOFFS.medium * 100}%`,
                                                }}
                                            >
                                                Low
                                            </span>
                                            <span
                                                className="text-center"
                                                style={{
                                                    width: `${(RISK_BAND_CUTOFFS.high - RISK_BAND_CUTOFFS.medium) * 100}%`,
                                                }}
                                            >
                                                Medium
                                            </span>
                                            <span className="flex-1 text-right">
                                                High
                                            </span>
                                        </div>
                                    </div>
                                )}
                            {analysis.risk_level &&
                                RISK_MEANINGS[analysis.risk_level] && (
                                    <p>
                                        <span className="font-medium">
                                            What this means:
                                        </span>{' '}
                                        {RISK_MEANINGS[analysis.risk_level]}
                                    </p>
                                )}
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
                            {typeof analysis.duration_s === 'number' &&
                                analysis.duration_s > 0 && (
                                    <p className="text-xs text-neutral-500">
                                        Sample length:{' '}
                                        {analysis.duration_s.toFixed(1)}{' '}
                                        seconds.
                                    </p>
                                )}
                            {analysis.model?.available === false && (
                                <p className="text-xs text-neutral-500">
                                    Limited result — the analysis model was
                                    offline when this sample was processed.
                                </p>
                            )}
                            {(analysis.risk_level === 'low' ||
                                analysis.risk_level === 'medium' ||
                                analysis.risk_level === 'high') && (
                                <div>
                                    <p className="font-medium">
                                        What happens next:
                                    </p>
                                    <ol className="ml-5 list-decimal space-y-1">
                                        <li>
                                            Your doctor reviews this result
                                            together with your interview notes.
                                        </li>
                                        <li>
                                            You will still be examined in person
                                            — this result guides that exam, it
                                            does not replace it.
                                        </li>
                                        <li>
                                            Mention any new symptoms at your
                                            visit, such as fever, night sweats,
                                            or weight loss.
                                        </li>
                                    </ol>
                                </div>
                            )}
                            {analysis.risk_level === 'unclear' && (
                                <p>
                                    Tap Record Cough below to try again with a
                                    clearer sample.
                                </p>
                            )}
                            <p className="text-xs italic">
                                This is not a diagnosis. Please see a doctor for
                                a clinical assessment.
                            </p>
                        </CardContent>
                    )}
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Cough Sample</CardTitle>
                        <p className="text-sm text-neutral-500">
                            {awaitingCough
                                ? 'Sage is ready — recording starts automatically.'
                                : recordingCough
                                  ? 'Cough twice toward the microphone now.'
                                  : analysisPending
                                    ? 'Your sample is being analysed. This page updates automatically.'
                                    : coughPhase === 'complete'
                                      ? 'Sample analysed. You can continue the consultation.'
                                      : coughPhase === 'error'
                                        ? 'The sample could not be sent. Try again when ready.'
                                        : 'Sage will start recording automatically when a cough sample is requested.'}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full"
                            onClick={() => void startCough()}
                            disabled={
                                recordingCough ||
                                awaitingCough ||
                                analysisPending
                            }
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
                                : analysisPending
                                  ? 'Analysing…'
                                  : coughPhase === 'error'
                                    ? 'Try Again'
                                    : 'Record Cough'}
                        </Button>
                        {recordingCough && (
                            <div className="mt-3">
                                <div
                                    role="meter"
                                    aria-label="Microphone input level"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={Math.round(micLevel * 100)}
                                    className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
                                >
                                    <div
                                        className="h-full rounded-full bg-emerald-500 transition-[width] duration-150"
                                        style={{
                                            width: `${Math.min(100, Math.round(micLevel * 100))}%`,
                                        }}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-neutral-500">
                                    Make sure the bar moves while you cough.
                                </p>
                            </div>
                        )}
                        {quietSample && !recordingCough && (
                            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                                That sample was very quiet — move closer to the
                                microphone and try again.
                            </p>
                        )}
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

export type { CoughAnalysis, ChatMessage, Capture };
