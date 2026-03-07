/**
 * Browser-compatible Audio Utilities for Gemini Multimodal Live API
 */

export class AudioRecorder {
    constructor(sampleRate = 16000) {
        this.sampleRate = sampleRate;
        this.audioContext = null;
        this.stream = null;
        this.processor = null;
        this.onData = null;
    }

    async start(onData) {
        this.onData = onData;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: this.sampleRate,
        });

        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = this.audioContext.createMediaStreamSource(this.stream);

        // Using ScriptProcessor for simplicity in hackathon environments (supports all browsers)
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

        source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);

        this.processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);

            // Convert Float32 to Int16 PCM
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            // Encode to Base64 (using a helper to avoid Node Buffer)
            const base64 = this.arrayBufferToBase64(pcmData.buffer);
            if (this.onData) this.onData(base64);
        };
    }

    stop() {
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}

export class AudioPlayer {
    constructor(sampleRate = 24000) {
        this.sampleRate = sampleRate;
        this.audioContext = null;
        this.nextStartTime = 0;
        this.isPlaying = false;
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate,
            });
            this.nextStartTime = this.audioContext.currentTime;
        }
    }

    async playChunk(base64Data) {
        this.init();
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // PCM 16-bit to Float32
        const int16Ready = new Int16Array(bytes.buffer);
        const float32Data = new Float32Array(int16Ready.length);
        for (let i = 0; i < int16Ready.length; i++) {
            float32Data[i] = int16Ready[i] / 0x8000;
        }

        const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, this.sampleRate);
        audioBuffer.getChannelData(0).set(float32Data);

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);

        // Schedule playback to be seamless
        const startTime = Math.max(this.audioContext.currentTime, this.nextStartTime);
        source.start(startTime);
        this.nextStartTime = startTime + audioBuffer.duration;
    }

    stop() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.nextStartTime = 0;
    }
}
