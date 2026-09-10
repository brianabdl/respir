export type LiveTurn = { role: 'user' | 'assistant'; content: string };

export type LiveSetup = {
    token: string;
    model: string;
    system_instruction: string;
};

export type LiveOptions = {
    setup: LiveSetup;
    onOpen: () => void;
    onUserTranscript: (text: string, isFinal: boolean) => void;
    onAssistantTranscript: (text: string, isFinal: boolean) => void;
    onAudioChunk: (base64: string) => void;
    onInterrupted: () => void;
    onTurnComplete: () => void;
    onError: (error: unknown) => void;
    onClose: () => void;
};

const WS_URL =
    'wss://generativelanguage.googleapis.com/v1alpha/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';

/**
 * Thin browser client for the Gemini Live API (BidiGenerateContent).
 * Streams 16 kHz PCM audio up, receives 24 kHz PCM voice + transcripts down.
 */
export class GeminiLiveClient {
    private socket: WebSocket | null = null;
    private options: LiveOptions;
    private inputContextOverflow = false;

    constructor(options: LiveOptions) {
        this.options = options;
    }

    connect(): void {
        const socket = new WebSocket(
            `${WS_URL}?access_token=${encodeURIComponent(this.options.setup.token)}`,
        );
        this.socket = socket;

        socket.onopen = () => this.sendSetup();
        socket.onmessage = (event) => void this.handle(event.data as Blob);
        socket.onerror = (error) => this.options.onError(error);
        socket.onclose = () => this.options.onClose();
    }

    isReady(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    disconnect(): void {
        this.socket?.close(1000, 'session-over');
        this.socket = null;
    }

    /** Lock in config, then ask for the greeting turn. */
    sendSetup(): void {
        this.sendJson({
            setup: {
                model: this.options.setup.model,
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    mediaResolution: 'MEDIA_RESOLUTION_LOW',
                },
                systemInstruction: {
                    parts: [{ text: this.options.setup.system_instruction }],
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
        });

        this.sendJson({
            clientContent: {
                turns: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: 'Open the conversation now with your greeting turn.',
                            },
                        ],
                    },
                ],
                turnComplete: true,
            },
        });
    }

    /** Stream a 16 kHz PCM16 mic chunk to the session. */
    sendAudioChunk(base64: string, mimeType = 'audio/pcm;rate=16000'): void {
        if (!this.isReady()) return;

        this.sendJson({
            realtimeInput: {
                audio: { audioChunks: [{ data: base64, mimeType }] },
            },
        });
    }

    /** Send a text turn, ending the patient's turn when requested. */
    sendText(text: string, turnComplete = true): void {
        if (!this.isReady()) return;

        this.sendJson({
            clientContent: {
                turns: [{ role: 'user', parts: [{ text }] }],
                turnComplete,
            },
        });
    }

    private sendJson(payload: unknown): void {
        this.socket?.send(new Blob([JSON.stringify(payload)]));
    }

    private async handle(data: Blob): Promise<void> {
        const json = JSON.parse(await data.text()) as {
            setupComplete?: unknown;
            interrupted?: boolean;
            serverContent?: {
                modelTurn?: {
                    parts?: Array<{
                        text?: string;
                        inlineData?: { data?: string };
                    }>;
                };
                turnComplete?: boolean;
                generationComplete?: boolean;
                interrupted?: boolean;
            };
            inputTranscription?: { text: string };
            serverOutputTranscription?: { text: string };
            goAway?: unknown;
        };

        if (json.setupComplete) {
            this.options.onOpen();
            return;
        }

        if (json.interrupted) {
            this.options.onInterrupted();
        }

        if (json.serverContent?.interrupted) {
            this.options.onInterrupted();
        }

        if (json.serverContent?.modelTurn?.parts) {
            for (const part of json.serverContent.modelTurn.parts) {
                if (part.text) {
                    this.options.onAssistantTranscript(part.text, false);
                }
                if (part.inlineData?.data) {
                    this.options.onAudioChunk(part.inlineData.data);
                }
            }
        }

        if (json.serverContent?.turnComplete) {
            this.options.onTurnComplete();
        }

        if (json.serverContent?.generationComplete) {
            this.options.onTurnComplete();
        }

        if (json.inputTranscription?.text) {
            this.options.onUserTranscript(json.inputTranscription.text, false);
        }

        if (json.serverOutputTranscription?.text) {
            this.options.onAssistantTranscript(
                json.serverOutputTranscription.text,
                true,
            );
        }

        if (json.goAway) {
            this.options.onClose();
        }
    }
}
