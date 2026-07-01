"use client";

// Microphone capture for consultation recording. Accumulates raw mono PCM via
// the WebAudio graph (not MediaRecorder) so partial audio can be pulled out
// mid-recording for near-live transcription. Samples are resampled to 16 kHz —
// what Whisper expects — when read back.

export class RecorderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecorderError";
  }
}

function friendlyMicError(e: unknown): RecorderError {
  const name = e instanceof Error ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return new RecorderError(
      "Microphone access was blocked. Allow the mic for this site in your browser, then try again."
    );
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return new RecorderError(
      "No microphone was found. Plug one in (or check your system settings) and try again."
    );
  }
  return new RecorderError(
    `Couldn't start recording: ${e instanceof Error ? e.message : String(e)}`
  );
}

/** Linear-resample mono Float32 audio from `inputRate` to 16 kHz. */
function resampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  const targetRate = 16_000;
  if (inputRate === targetRate) return input;
  const ratio = inputRate / targetRate;
  const outLength = Math.floor(input.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = src - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}

interface StartHandlers {
  /** 0..1 RMS level, for the live meter. */
  onLevel?: (level: number) => void;
}

// ScriptProcessorNode is deprecated but universally supported and the simplest
// way to pull a continuous PCM stream; the alternative (AudioWorklet) needs a
// separately-served module for marginal benefit here.
type LegacyAudioContext = typeof AudioContext;

export class AudioRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sink: GainNode | null = null;
  private chunks: Float32Array[] = [];
  private inputRate = 16_000;
  private handlers: StartHandlers = {};

  get sampleCount(): number {
    return this.chunks.reduce((n, c) => n + c.length, 0);
  }

  /** Seconds of audio captured so far. */
  get durationS(): number {
    return this.inputRate > 0 ? this.sampleCount / this.inputRate : 0;
  }

  async start(handlers: StartHandlers = {}): Promise<void> {
    this.handlers = handlers;
    this.chunks = [];
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (e) {
      throw friendlyMicError(e);
    }

    const Ctor: LegacyAudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: LegacyAudioContext })
        .webkitAudioContext;
    // Prefer a 16 kHz context so no resampling is needed; browsers that ignore
    // the hint just give their native rate and resampleTo16k handles it.
    let ctx: AudioContext;
    try {
      ctx = new Ctor({ sampleRate: 16_000 });
    } catch {
      ctx = new Ctor();
    }
    this.ctx = ctx;
    this.inputRate = ctx.sampleRate;
    await ctx.resume();

    this.source = ctx.createMediaStreamSource(this.stream);
    // 2048 frames ≈ a callback every ~128 ms at 16 kHz — responsive level meter
    // without flooding the main thread.
    this.processor = ctx.createScriptProcessor(2048, 1, 1);
    this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const data = e.inputBuffer.getChannelData(0);
      this.chunks.push(new Float32Array(data)); // copy — buffer is reused
      if (this.handlers.onLevel) {
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        this.handlers.onLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
      }
    };
    // Route through a silent sink so onaudioprocess fires without echoing audio.
    this.sink = ctx.createGain();
    this.sink.gain.value = 0;
    this.source.connect(this.processor);
    this.processor.connect(this.sink);
    this.sink.connect(ctx.destination);
  }

  /** Snapshot everything captured so far as 16 kHz mono (a fresh copy). */
  getSamples16k(): Float32Array {
    const total = this.sampleCount;
    const merged = new Float32Array(total);
    let offset = 0;
    for (const c of this.chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    return resampleTo16k(merged, this.inputRate);
  }

  /** Stop capture and release the microphone. Keeps captured samples. */
  stop(): void {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.sink?.disconnect();
    if (this.processor) this.processor.onaudioprocess = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.processor = null;
    this.source = null;
    this.sink = null;
    this.stream = null;
    this.ctx = null;
  }
}
