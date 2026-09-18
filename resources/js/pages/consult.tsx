import {
    LoaderCircle,
    MessageSquare,
    Mic,
    SendHorizontal,
    Video,
    VideoOff,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useEcho } from '@laravel/echo-react';
import { Button } from '@/components/ui/button';
import ConsentGate from '@/components/consent-gate';
import { cn } from '@/lib/utils';
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

// Upper bound on the cough upload fetch, so a dead network can't block Sage's
// turn forever — the tool call must always resolve and hand control back.
const COUGH_UPLOAD_TIMEOUT_MS = 10_000;
// Last-resort safety net for the tool-call recording wait: covers the 4s
// capture plus the upload timeout above, with headroom for a MediaRecorder
// that never fires 'stop' or 'error' at all.
const COUGH_TOOL_CALL_SAFETY_MS = 16_000;
const CONTEXT_FETCH_TIMEOUT_MS = 8_000;

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

const END_CONSULTATION_TOOL: LiveTool = {
    functionDeclarations: [
        {
            name: 'end_consultation',
            description:
                'Closes the voice consultation. Call this after the cough sample has been captured and the patient has no more questions. Deliver a short warm closing summary and a goodbye first, then call this function.',
            parameters: { type: 'object', properties: {} },
        },
    ],
};

const RECALL_CONVERSATION_TOOL: LiveTool = {
    functionDeclarations: [
        {
            name: 'recall_conversation_context',
            description:
                'Searches the patient\'s earlier conversation in this consultation (previous voice sessions and the turn-based chat). Use it only when the patient refers to something said earlier that you cannot remember, or to check whether a topic was already covered. Pass the topic or a short query, for example "cough" or "fever duration". Returns matching patient and assistant turns only.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description:
                            'The topic or question to search for, for example "cough" or "night sweats".',
                    },
                },
                required: ['query'],
            },
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
    low: 'bg-white/30',
    medium: 'bg-white/60',
    high: 'bg-white',
    unclear: 'bg-neutral-500',
};

function StatusPill({
    pulse = false,
    children,
}: {
    pulse?: boolean;
    children: ReactNode;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 font-mono text-[10px] tracking-widest text-[#E4E4E7] uppercase backdrop-blur',
                pulse && 'animate-pulse',
            )}
        >
            <span className="size-1.5 rounded-full bg-white/80" />
            {children}
        </span>
    );
}

/**
 * Radial spectrum for Sage's camera tile. Reads real playback frequency
 * data from `speakerRef` while Sage is speaking (LiveSpeaker.getFrequencyData);
 * otherwise animates a deterministic idle/thinking hum keyed off the voice
 * state, so the tile never sits dead-flat between turns.
 */
function SageSpectrum({
    speakerRef,
    speaking,
    generating,
    awaitingSpeech,
    connecting,
    connected,
}: {
    speakerRef: { current: LiveSpeaker | null };
    speaking: boolean;
    generating: boolean;
    awaitingSpeech: boolean;
    connecting: boolean;
    connected: boolean;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef({
        speaking,
        generating,
        awaitingSpeech,
        connecting,
        connected,
    });
    stateRef.current = {
        speaking,
        generating,
        awaitingSpeech,
        connecting,
        connected,
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const BAR_COUNT = 64;
        const bins = new Uint8Array(BAR_COUNT);
        const startTime = performance.now();
        let raf = 0;

        function resize() {
            const rect = canvas!.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas!.width = Math.max(1, Math.round(rect.width * dpr));
            canvas!.height = Math.max(1, Math.round(rect.height * dpr));
        }
        resize();
        // Window resize alone misses this: opening/closing the transcript
        // panel changes the tile's flex width without the window resizing,
        // so the canvas's backing buffer must track the element itself.
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);

        // How "awake" the tile looks per voice state — real audio (below)
        // overrides this the moment Sage is actually speaking.
        function energyFor(): number {
            const s = stateRef.current;
            if (s.speaking) return 1;
            if (s.generating) return 0.55;
            if (s.awaitingSpeech) return 0.4;
            if (s.connecting) return 0.25;
            if (s.connected) return 0.18;
            return 0.08;
        }

        // Deterministic burst/pause cadence so idle motion reads as
        // "breathing", not random jitter.
        function envelope(t: number): number {
            const burst = Math.max(0, Math.sin(t * 1.7));
            const shaped = burst * burst;
            const flutter = 0.5 + 0.5 * Math.sin(t * 13.0);
            return shaped * (0.35 + 0.65 * flutter);
        }

        function proceduralBar(i: number, t: number, energy: number): number {
            const wobble =
                0.5 +
                0.5 *
                    Math.sin(i * 0.37 + t * 2.3) *
                    Math.sin(i * 0.13 - t * 1.1 + i);
            const env = energy * (0.3 + 0.7 * envelope(t));
            return Math.max(0, Math.min(1, env * (0.25 + 0.75 * wobble)));
        }

        function draw(now: number) {
            const t = (now - startTime) / 1000;
            const energy = energyFor();
            const live =
                stateRef.current.speaking &&
                speakerRef.current?.getFrequencyData(bins);

            const w = canvas!.width;
            const h = canvas!.height;
            ctx!.clearRect(0, 0, w, h);

            const cx = w / 2;
            const cy = h / 2;
            const minDim = Math.min(w, h);
            const coreBase = minDim * 0.1;
            const barInner = minDim * 0.16;
            const barMax = minDim * 0.32;
            const barW = Math.max(
                1.5,
                ((2 * Math.PI * barInner) / BAR_COUNT) * 0.55,
            );

            let rms = 0;

            for (let i = 0; i < BAR_COUNT; i++) {
                const magnitude = live
                    ? bins[i] / 255
                    : proceduralBar(i, t, energy);
                rms += magnitude;

                const angle = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
                const len = barInner + magnitude * barMax;
                const x1 = cx + Math.cos(angle) * barInner;
                const y1 = cy + Math.sin(angle) * barInner;
                const x2 = cx + Math.cos(angle) * len;
                const y2 = cy + Math.sin(angle) * len;

                ctx!.strokeStyle = `rgba(255,255,255,${0.2 + magnitude * 0.65})`;
                ctx!.lineWidth = barW;
                ctx!.lineCap = 'round';
                ctx!.beginPath();
                ctx!.moveTo(x1, y1);
                ctx!.lineTo(x2, y2);
                ctx!.stroke();
            }
            rms /= BAR_COUNT;

            const coreR = coreBase + rms * coreBase * 1.6;
            const glow = ctx!.createRadialGradient(
                cx,
                cy,
                0,
                cx,
                cy,
                coreR * 3,
            );
            glow.addColorStop(0, `rgba(255,255,255,${0.3 + rms * 0.35})`);
            glow.addColorStop(1, 'rgba(255,255,255,0)');
            ctx!.fillStyle = glow;
            ctx!.beginPath();
            ctx!.arc(cx, cy, coreR * 3, 0, Math.PI * 2);
            ctx!.fill();

            ctx!.fillStyle = '#ffffff';
            ctx!.beginPath();
            ctx!.arc(cx, cy, coreR, 0, Math.PI * 2);
            ctx!.fill();

            raf = requestAnimationFrame(draw);
        }

        raf = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(raf);
            observer.disconnect();
        };
    }, [speakerRef]);

    return (
        <canvas
            ref={canvasRef}
            role="img"
            aria-label="Sage voice activity"
            className="absolute inset-0 size-full"
        />
    );
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
    const [chatOpen, setChatOpen] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

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
    const [connecting, setConnecting] = useState(false);
    const [awaitingSpeech, setAwaitingSpeech] = useState(false);

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
    const toolCoughRef = useRef(false);
    const coughUploadOkRef = useRef(false);
    const closingRef = useRef(false);
    const closingInProgressRef = useRef(false);
    const closingTimerRef = useRef<number | null>(null);
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
        // Leading dot: must match broadcastAs() verbatim. Without it Echo
        // prepends the App.Events namespace and this handler never fires.
        '.cough.analysis',
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

    const previousChatLength = useRef(messages.length);

    useEffect(() => {
        if (!chatOpen && chat.length > previousChatLength.current) {
            setUnreadCount(
                (count) => count + chat.length - previousChatLength.current,
            );
        }
        previousChatLength.current = chat.length;
    }, [chat, chatOpen]);

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
            if (closingTimerRef.current !== null) {
                window.clearTimeout(closingTimerRef.current);
                closingTimerRef.current = null;
            }
        },
        [],
    );

    /**
     * Start the cough-capture countdown. Guarded by coughStartedRef so the
     * explicit start_cough_capture tool signal and the handleAssistantCue
     * keyword backup can never both fire.
     */
    function triggerCoughCapture() {
        if (coughStartedRef.current) return;

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

    // Backup only: the SSE /chat stream now also emits an explicit 'tool'
    // event when the agent calls start_cough_capture (see send()). This
    // keyword check just covers the rare case where that event doesn't
    // decode client-side.
    function handleAssistantCue(said: string) {
        if (said.toLowerCase().includes('microphone')) {
            triggerCoughCapture();
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
        closingRef.current = false;
        closingInProgressRef.current = false;
        toolCoughRef.current = false;
        coughUploadOkRef.current = false;
        if (closingTimerRef.current !== null) {
            window.clearTimeout(closingTimerRef.current);
            closingTimerRef.current = null;
        }
        setSessionStarted(true);
        setConnecting(true);
        setAwaitingSpeech(false);
        setVoiceHint('Connecting to Sage…');

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
                    setConnecting(false);
                    setAwaitingSpeech(true);
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
                    setAwaitingSpeech(false);
                    setGenerating(true);
                },
                onAudioChunk: (chunk) => {
                    setAwaitingSpeech(false);
                    setSpeaking(true);
                    void speaker.enqueue(chunk);
                },
                onInterrupted: () => {
                    assistantPlaybackTokenRef.current += 1;
                    speaker.interrupt();
                    setAwaitingSpeech(false);
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
                        void finishAssistantTurn(
                            said,
                            speaker,
                            playbackToken,
                        ).finally(() => {
                            if (closingRef.current) {
                                void beginGracefulClose();
                            }
                        });
                    } else {
                        setSpeaking(false);
                        if (closingRef.current) {
                            void beginGracefulClose();
                        }
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
                    setAwaitingSpeech(false);
                    void saveSessionLog(true);
                    setVoiceHint('Voice session ended — tap to restart');
                },
                tools: [
                    COUGH_CAPTURE_TOOL,
                    RECALL_CONVERSATION_TOOL,
                    END_CONSULTATION_TOOL,
                ],
                onFunctionCall: (name, args) => handleToolCall(name, args),
            });

            liveRef.current = live;
            live.connect();
        } catch (error) {
            console.error('Could not start Live session', error);
            setConnecting(false);
            setAwaitingSpeech(false);
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
        if (closingTimerRef.current !== null) {
            window.clearTimeout(closingTimerRef.current);
            closingTimerRef.current = null;
        }
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
        setConnecting(false);
        setAwaitingSpeech(false);
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
                    if (
                        event.type === 'tool' &&
                        event.name === 'start_cough_capture'
                    ) {
                        triggerCoughCapture();
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
                    // Raw capture: browser noise suppression, AGC, and echo
                    // cancellation treat cough bursts as noise and destroy
                    // them irreversibly. Burst isolation and any denoising
                    // happen downstream in the AI service instead.
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
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
                    signal: AbortSignal.timeout(COUGH_UPLOAD_TIMEOUT_MS),
                },
            );

            if (!response.ok) {
                const details = (await response.text()).slice(0, 500);
                throw new Error(
                    `Cough upload failed (${response.status})${details ? `: ${details}` : ''}`,
                );
            }

            coughUploadOkRef.current = true;
            setVoiceHint('Cough sample received — wrapping up');

            // Tool-driven captures deliver the closing instruction inside the
            // tool response; a manual sidebar capture needs a direct prompt.
            if (!toolCoughRef.current && !closingRef.current) {
                void promptModelWrapUp();
            }
        } catch (error) {
            coughUploadOkRef.current = false;
            console.error('Could not send the cough sample', error);
            setCoughPhase('error');
            setVoiceHint('Could not send cough sample — try again');
        }
    }

    async function handleToolCall(
        name: string,
        args: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
        if (name === 'recall_conversation_context') {
            return recallConversationContext(args);
        }

        if (name === 'end_consultation') {
            return handleEndConsultation();
        }

        if (name !== 'start_cough_capture') {
            return { status: 'unsupported' };
        }

        if (coughPhase === 'recording' || coughPhase === 'processing') {
            return { status: 'already_recording' };
        }

        if (closingRef.current) {
            return { status: 'already_closing' };
        }

        toolCoughRef.current = true;
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
                let settled = false;
                const finish = () => {
                    if (settled) return;
                    settled = true;
                    resolve();
                };

                // onstop's handler (set in startCough) awaits analyzeCough's
                // upload — wait for that promise too, not just the event,
                // otherwise coughUploadOkRef below reads stale before the
                // upload has actually finished.
                const originalStop = recorder.onstop;
                recorder.onstop = async (event) => {
                    try {
                        await originalStop?.call(recorder, event);
                    } finally {
                        finish();
                    }
                };

                // A recorder error never fires 'stop', so without this the
                // tool call — and Sage's turn — would hang forever.
                const originalError = recorder.onerror;
                recorder.onerror = (event) => {
                    originalError?.call(recorder, event);
                    finish();
                };

                window.setTimeout(finish, COUGH_TOOL_CALL_SAFETY_MS);
            });
        }

        toolCoughRef.current = false;

        if (coughUploadOkRef.current) {
            scheduleForcedClose();
            return {
                status: 'recording_started',
                duration_s: 4,
                note: 'The cough sample was captured and submitted for secure analysis. The consultation is complete: give the patient a concise warm closing summary and a goodbye, then call the end_consultation function.',
            };
        }

        return { status: 'recording_started', duration_s: 4 };
    }

    function handleEndConsultation(): Record<string, unknown> {
        closingRef.current = true;
        setVoiceHint('Wrapping up — thank you');
        scheduleForcedClose();
        return { status: 'closing' };
    }

    async function promptModelWrapUp(): Promise<void> {
        const live = liveRef.current;
        if (!live?.isReady() || closingRef.current) return;

        live.sendText(
            'The cough sample has been captured and submitted for secure analysis. The consultation is complete: give the patient a concise warm closing summary and a goodbye, then call the end_consultation function.',
        );
        scheduleForcedClose();
    }

    function scheduleForcedClose(): void {
        if (closingTimerRef.current !== null) return;
        closingTimerRef.current = window.setTimeout(() => {
            closingTimerRef.current = null;
            void beginGracefulClose();
        }, 20_000);
    }

    async function beginGracefulClose(): Promise<void> {
        const live = liveRef.current;
        if (!live || closingInProgressRef.current) return;
        closingInProgressRef.current = true;

        if (closingTimerRef.current !== null) {
            window.clearTimeout(closingTimerRef.current);
            closingTimerRef.current = null;
        }

        const speaker = speakerRef.current;

        if (speaker) {
            const deadline = Date.now() + 20_000;

            while (speaker.isSpeaking() && Date.now() < deadline) {
                await new Promise<void>((resolve) =>
                    window.setTimeout(resolve, 50),
                );
            }
        }

        teardownLiveSession();
    }

    async function recallConversationContext(
        args: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
        const query = typeof args.query === 'string' ? args.query.trim() : '';

        if (query === '') {
            return { status: 'missing_query' };
        }

        try {
            const response = await fetch(
                ConsultationController.conversationContext.url(
                    consultation.id,
                    { query: { q: query } },
                ),
                {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    signal: AbortSignal.timeout(CONTEXT_FETCH_TIMEOUT_MS),
                },
            );

            if (!response.ok) {
                return { status: 'unavailable' };
            }

            const data = (await response.json()) as {
                turns: Array<{ role: 'user' | 'assistant'; text: string }>;
            };

            return { status: 'ok', turns: data.turns };
        } catch {
            return { status: 'unavailable' };
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

    const awaitingCough = coughPhase === 'prompted';
    const recordingCough = coughPhase === 'recording';
    const analysisPending = coughPhase === 'processing';
    const showingPreviousAssessment =
        !sessionStarted && Boolean(consultation.cough_analysis);

    return (
        <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-black text-white sm:flex-row">
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

            <div className="relative min-h-0 flex-1 overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 sm:gap-3 sm:p-3">
                    <div className="relative overflow-hidden rounded-[18px] bg-[#111114]">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="absolute inset-0 size-full object-cover"
                        />
                        {!cameraOn && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="flex size-16 items-center justify-center rounded-full border border-white/15 bg-white/5">
                                    <VideoOff className="size-6 text-[#71717A]" />
                                </div>
                            </div>
                        )}
                        <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-1 font-mono text-[10px] tracking-widest text-[#E4E4E7] uppercase backdrop-blur">
                            You
                        </span>
                    </div>

                    <div className="relative overflow-hidden rounded-[18px] border border-white/10 bg-[#111114]">
                        <SageSpectrum
                            speakerRef={speakerRef}
                            speaking={speaking}
                            generating={generating}
                            awaitingSpeech={awaitingSpeech}
                            connecting={connecting}
                            connected={connected}
                        />
                        <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-1 font-mono text-[10px] tracking-widest text-[#E4E4E7] uppercase backdrop-blur">
                            Sage
                        </span>
                    </div>
                </div>

                <div className="pointer-events-none absolute inset-0 bg-black/20" />

                <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-5">
                    <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-black/40 py-1.5 pr-3 pl-2.5 backdrop-blur">
                        <img
                            src="/Respir logo.png"
                            alt="Respir"
                            className="h-4 w-auto"
                        />
                        <span className="h-3 w-px bg-white/15" />
                        <span className="font-mono text-[10px] leading-tight tracking-widest text-[#71717A] uppercase">
                            pre-visit · voice consult
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {connecting && (
                            <StatusPill pulse>connecting</StatusPill>
                        )}
                        {awaitingSpeech && (
                            <StatusPill pulse>sage is ready</StatusPill>
                        )}
                        {speaking && <StatusPill pulse>talking</StatusPill>}
                        {generating && <StatusPill>generating</StatusPill>}
                        {connected &&
                            !speaking &&
                            !generating &&
                            !connecting &&
                            !awaitingSpeech && (
                                <StatusPill pulse>listening</StatusPill>
                            )}
                        <StatusPill>
                            {cameraOn ? 'camera live' : 'camera off'}
                        </StatusPill>
                    </div>
                </div>

                {awaitingCough && !recordingCough && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/25">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="relative flex size-28 items-center justify-center rounded-full border border-white/25 bg-white/5">
                                <span className="absolute inset-0 animate-ping rounded-full border border-white/30" />
                                <Mic className="size-10 text-[#94A3B8]" />
                            </div>
                            <div>
                                <p className="font-mono text-[10px] tracking-widest text-[#A1A1AA] uppercase">
                                    get ready
                                </p>
                                <p className="mt-1 text-lg font-semibold">
                                    Cough sample coming next
                                </p>
                                <p className="mt-1 text-sm text-[#A1A1AA]">
                                    Recording starts automatically — no need to
                                    press anything.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {recordingCough && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/25">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="relative flex size-28 items-center justify-center rounded-full border border-white/50 bg-white/10">
                                <span className="absolute inset-0 animate-ping rounded-full border border-white/40" />
                                <span className="absolute inset-2 animate-pulse rounded-full bg-white/10" />
                                <Mic className="relative size-10 animate-pulse text-white" />
                            </div>
                            <div>
                                <p className="font-mono text-[10px] tracking-widest text-[#94A3B8] uppercase">
                                    recording
                                </p>
                                <p className="mt-1 text-lg font-semibold">
                                    Cough twice toward the microphone
                                </p>
                                <div
                                    role="meter"
                                    aria-label="Microphone input level"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={Math.round(micLevel * 100)}
                                    className="mx-auto mt-3 h-1 w-3/4 max-w-56 overflow-hidden rounded-full bg-white/10"
                                >
                                    <div
                                        className="h-full rounded-full bg-white/70 transition-[width] duration-150"
                                        style={{
                                            width: `${Math.min(100, Math.round(micLevel * 100))}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {analysisPending && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/25">
                        <div className="flex items-center gap-2 rounded-[14px] border border-white/10 bg-[#0B0B0D]/90 px-4 py-3">
                            <LoaderCircle className="size-4 animate-spin text-[#94A3B8]" />
                            <span className="font-mono text-[10px] tracking-widest text-[#A1A1AA] uppercase">
                                analysing sample securely
                            </span>
                        </div>
                    </div>
                )}

                {!sessionStarted && !connecting && !awaitingSpeech && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-black/55 px-4 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-2">
                            <img
                                src="/Respir logo.png"
                                alt="Respir"
                                className="h-7 w-auto"
                            />
                            <span className="font-mono text-[10px] tracking-widest text-[#71717A] uppercase">
                                pre-visit consult
                            </span>
                        </div>
                        <p className="max-w-sm text-center text-sm text-[#A1A1AA]">
                            Sage, your voice assistant, will greet you live —
                            like a real conversation. Your camera sits beside
                            Sage's voice, and the transcript lives in the chat
                            panel.
                        </p>
                        {showingPreviousAssessment && (
                            <p className="font-mono text-[10px] tracking-widest text-[#71717A] uppercase">
                                previous cough screening on file
                            </p>
                        )}
                        <Button
                            className="rounded-[14px] bg-white px-6 font-semibold text-black transition-all duration-200 hover:scale-105 hover:bg-[#CBD5E1] active:scale-95"
                            size="lg"
                            onClick={() => {
                                if (consented) {
                                    void startVoiceConsult();
                                } else {
                                    setConsentOpen(true);
                                }
                            }}
                        >
                            <Mic className="size-5" />
                            Start session
                        </Button>
                    </div>
                )}

                {(sessionStarted || connecting || awaitingSpeech) && (
                    <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 p-4 sm:p-5">
                        {sessionStarted && voiceHint && (
                            <span className="rounded-full border border-white/10 bg-black/40 px-4 py-1.5 font-mono text-[10px] tracking-widest text-[#A1A1AA] uppercase backdrop-blur">
                                {voiceHint}
                            </span>
                        )}

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={
                                    cameraOn ? 'Stop camera' : 'Start camera'
                                }
                                onClick={toggleCamera}
                                className={cn(
                                    'rounded-full border border-white/10 bg-black/40 text-white backdrop-blur transition-all duration-200 hover:scale-105 hover:bg-white/10 active:scale-95',
                                    cameraOn &&
                                        'bg-white text-black hover:bg-[#CBD5E1]',
                                )}
                            >
                                <Video className="size-5" />
                            </Button>

                            {cameraOn && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => void capturePhoto()}
                                    className="rounded-full border border-white/10 bg-black/40 text-white backdrop-blur transition-all duration-200 hover:scale-105 hover:bg-white/10 active:scale-95"
                                >
                                    Save photo
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Open chat"
                                onClick={() => {
                                    setChatOpen(true);
                                    setUnreadCount(0);
                                }}
                                className="relative rounded-full border border-white/10 bg-black/40 text-white backdrop-blur transition-all duration-200 hover:scale-105 hover:bg-white/10 active:scale-95"
                            >
                                <MessageSquare className="size-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black">
                                        {unreadCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {(sessionStarted || connecting || awaitingSpeech) && chatOpen && (
                <aside className="animate-panel-in flex h-[45vh] w-full shrink-0 flex-col overflow-hidden border-t border-white/10 bg-[#0B0B0D]/95 shadow-2xl backdrop-blur sm:h-full sm:w-96 sm:border-t-0 sm:border-l">
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                        <div className="flex flex-col">
                            <h2 className="text-sm font-semibold">
                                Transcript
                            </h2>
                            <span className="font-mono text-[10px] tracking-widest text-[#71717A] uppercase">
                                {connecting
                                    ? 'Connecting to Sage…'
                                    : awaitingSpeech
                                      ? 'Sage is about to speak…'
                                      : speaking
                                        ? 'Sage is speaking — talk over it to interrupt'
                                        : generating
                                          ? 'Generating reply…'
                                          : connected
                                            ? 'Listening — turn-taking is automatic'
                                            : useFallbackLoop
                                              ? 'Turn-based voice — speak or type to reply'
                                              : 'Idle'}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Close chat"
                            onClick={() => {
                                setChatOpen(false);
                                setUnreadCount(0);
                            }}
                            className="rounded-[14px] text-[#A1A1AA] transition-all duration-200 hover:scale-105 hover:bg-white/10 hover:text-white active:scale-95"
                        >
                            <X className="size-5" />
                        </Button>
                    </div>

                    <div
                        ref={chatRef}
                        className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-4"
                    >
                        {chat.length === 0 && !assistantLive && !userLive && (
                            <p className="text-sm text-[#71717A]">
                                The conversation appears here, word by word as
                                it is spoken.
                            </p>
                        )}
                        {chat.map((msg, i) => (
                            <div
                                key={i}
                                className={
                                    msg.role === 'user'
                                        ? 'max-w-[85%] self-end rounded-[14px] bg-white px-3 py-2 text-sm text-black'
                                        : 'max-w-[85%] self-start rounded-[14px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-white'
                                }
                            >
                                {msg.content}
                            </div>
                        ))}
                        {userLive && (
                            <div className="max-w-[85%] self-end rounded-[14px] border border-white/20 bg-white/10 px-3 py-2 text-sm text-white italic">
                                {userLive}
                            </div>
                        )}
                        {speaking && (
                            <div className="flex items-center gap-1 self-start px-2 py-1">
                                <span className="size-2 animate-bounce rounded-full bg-white/60" />
                                <span className="animate-bounce-1 size-2 rounded-full bg-white/60" />
                                <span className="animate-bounce-2 size-2 rounded-full bg-white/60" />
                            </div>
                        )}
                        {assistantLive && (
                            <div className="max-w-[85%] self-start rounded-[14px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
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
                        className="flex gap-2 border-t border-white/10 p-4"
                    >
                        <textarea
                            value={message}
                            onChange={(
                                e: React.ChangeEvent<HTMLTextAreaElement>,
                            ) => setMessage(e.target.value)}
                            placeholder="Type here — replies stream the same way…"
                            disabled={streaming}
                            className="flex-1 resize-none rounded-[14px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-white shadow-none outline-none placeholder:text-[#71717A] focus-visible:border-white/30 focus-visible:ring-[3px] focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                            rows={2}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className="self-end rounded-[14px] bg-white text-black transition-all duration-200 hover:scale-105 hover:bg-[#CBD5E1] active:scale-95 disabled:hover:scale-100"
                            disabled={streaming || !message.trim()}
                            aria-label="Send message"
                        >
                            <SendHorizontal className="size-4" />
                        </Button>
                    </form>
                </aside>
            )}
        </div>
    );
}

Consult.layout = {
    breadcrumbs: [],
};

export type { CoughAnalysis, ChatMessage, Capture };
