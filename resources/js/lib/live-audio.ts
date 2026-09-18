import type { GeminiLiveClient } from './gemini-live';

function base64ToInt16(base64: string): Int16Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
}

function floatToInt16(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
}

function int16ToBase64(samples: Int16Array): string {
    const bytes = new Uint8Array(samples.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Captures the microphone at 16 kHz and forwards PCM16 chunks
 * to the Live API as base64 realtimeInput frames.
 */
export class LiveMic {
    private context: AudioContext | null = null;
    private processor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;

    start(stream: MediaStream, live: GeminiLiveClient): void {
        this.context = new AudioContext({ sampleRate: 16000 });
        this.source = this.context.createMediaStreamSource(stream);
        this.processor = this.context.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (event) => {
            if (!live.isReady()) return;

            const chunk = floatToInt16(event.inputBuffer.getChannelData(0));

            if (chunk.length > 0) {
                live.sendAudioChunk(int16ToBase64(chunk));
            }
        };

        this.source.connect(this.processor);
        this.processor.connect(this.context.destination);
    }

    stop(): void {
        this.processor?.disconnect();
        this.source?.disconnect();
        void this.context?.close();
        this.processor = null;
        this.source = null;
        this.context = null;
    }
}

/**
 * Queues 24 kHz PCM16 reply chunks from the Live API and plays them
 * seamlessly in order. interrupt() drops the queue (barge-in).
 */
export class LiveSpeaker {
    private context: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private queue: AudioBuffer[] = [];
    private nextTime = 0;
    private current: AudioBufferSourceNode | null = null;
    private playing = false;
    private epoch = 0;

    private ensureContext(): AudioContext {
        if (!this.context) {
            this.context = new AudioContext({ sampleRate: 24000 });
            this.analyser = this.context.createAnalyser();
            this.analyser.fftSize = 128;
            this.analyser.smoothingTimeConstant = 0.6;
            this.analyser.connect(this.context.destination);
        }
        return this.context;
    }

    /**
     * Fills `out` with the current playback spectrum (byte frequency data,
     * length must match `analyser.frequencyBinCount` = fftSize / 2 = 64).
     * Returns false before any audio has ever played, when there is no
     * analyser yet to read from.
     */
    getFrequencyData(out: Uint8Array<ArrayBuffer>): boolean {
        if (!this.analyser) return false;
        this.analyser.getByteFrequencyData(out);
        return true;
    }

    async enqueue(base64: string): Promise<void> {
        const samples = base64ToInt16(base64);
        const context = this.ensureContext();

        if (context.state === 'suspended') void context.resume();

        const buffer = context.createBuffer(1, samples.length, 24000);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) {
            channel[i] = samples[i] / 32768;
        }

        this.queue.push(buffer);
        await this.drain();
    }

    private async drain(): Promise<void> {
        if (this.playing) return;
        this.playing = true;

        const epoch = this.epoch;
        const context = this.ensureContext();

        while (this.queue.length > 0 && this.epoch === epoch) {
            const buffer = this.queue.shift();
            if (!buffer) break;

            const source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.analyser ?? context.destination);
            this.current = source;

            const startTime = Math.max(context.currentTime, this.nextTime);
            this.nextTime = startTime + buffer.duration;

            await new Promise<void>((resolve) => {
                source.onended = () => resolve();
                source.start(startTime);
            });
        }

        if (this.epoch === epoch) {
            this.playing = false;
            this.nextTime = 0;
        }
    }

    /** Drop the pending queue and stop current playback (barge-in). */
    interrupt(): void {
        this.epoch += 1;
        this.queue = [];
        this.current?.stop();
        this.current = null;
        this.nextTime = 0;
        this.playing = false;
    }

    isSpeaking(): boolean {
        return this.playing;
    }

    reset(): void {
        this.interrupt();
        void this.context?.close();
        this.context = null;
        this.analyser = null;
        this.queue = [];
        this.nextTime = 0;
        this.playing = false;
    }
}
