export type LiveFunctionDeclaration = {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
};

export type LiveTool = {
    functionDeclarations: LiveFunctionDeclaration[];
};

export type LiveTurn = { role: 'user' | 'assistant'; content: string };

export type LiveSetup = {
    token: string;
    model: string;
    language_code?: string;
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
    tools?: LiveTool[];
    onFunctionCall?: (
        name: string,
        args: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;
};

const WS_URL =
    'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';

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
        const language = this.options.setup.language_code;
        const transcriptionConfig = language
            ? { languageCodes: [language] }
            : {};

        const toolSetup = this.options.tools?.length
            ? { tools: this.options.tools }
            : {};

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
                inputAudioTranscription: transcriptionConfig,
                outputAudioTranscription: transcriptionConfig,
                ...toolSetup,
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
                audio: { data: base64, mimeType },
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

    /**
     * Reply to a client tool call so the model can continue its turn.
     */
    private sendToolResponse(
        responses: Array<{
            name: string;
            id?: string;
            response: Record<string, unknown>;
        }>,
    ): void {
        if (!this.isReady()) return;

        this.sendJson({
            toolResponse: { functionResponses: responses },
        });
    }

    private async handle(data: Blob): Promise<void> {
        const json = JSON.parse(await data.text()) as {
            setupComplete?: unknown;
            interrupted?: boolean;
            error?: { code?: number; message?: string };
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
                inputTranscription?: { text: string };
                interimInputTranscription?: { text: string };
                outputTranscription?: { text: string };
            };
            goAway?: unknown;
            toolCall?: {
                functionCalls?: Array<{
                    id?: string;
                    name?: string;
                    args?: Record<string, unknown>;
                }>;
            };
            toolCallCancellation?: { ids?: string[] };
        };

        if (json.error) {
            this.options.onError(json.error);
        }

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

        if (json.serverContent?.inputTranscription?.text) {
            this.options.onUserTranscript(
                json.serverContent.inputTranscription.text,
                true,
            );
        }

        if (json.serverContent?.interimInputTranscription?.text) {
            this.options.onUserTranscript(
                json.serverContent.interimInputTranscription.text,
                false,
            );
        }

        if (json.serverContent?.outputTranscription?.text) {
            this.options.onAssistantTranscript(
                json.serverContent.outputTranscription.text,
                false,
            );
        }

        // Gemini may send both flags for one response. Notify consumers once,
        // after final transcriptions have been delivered.
        if (
            json.serverContent?.turnComplete ||
            json.serverContent?.generationComplete
        ) {
            this.options.onTurnComplete();
        }

        if (json.toolCall?.functionCalls?.length) {
            const responses: Array<{
                name: string;
                id?: string;
                response: Record<string, unknown>;
            }> = [];

            for (const call of json.toolCall.functionCalls) {
                if (!call.name) continue;

                const response = this.options.onFunctionCall
                    ? await this.options.onFunctionCall(
                          call.name,
                          call.args ?? {},
                      )
                    : { status: 'unhandled' };

                responses.push({
                    name: call.name,
                    id: call.id,
                    response,
                });
            }

            this.sendToolResponse(responses);
        }

        if (json.goAway) {
            this.options.onClose();
        }
    }
}
