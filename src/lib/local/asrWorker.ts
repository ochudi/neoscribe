/// <reference lib="webworker" />
// Web worker owning a transformers.js automatic-speech-recognition pipeline
// (Whisper). Loads once, then transcribes 16 kHz mono Float32 audio snapshots
// handed to it by the recorder — full recordings or partial windows for the
// near-live preview.

import { pipeline } from "@huggingface/transformers";

import type { LocalDtype } from "@/lib/local/catalog";

export interface AsrLoadRequest {
  type: "load";
  hfId: string;
  device: "webgpu" | "wasm";
  dtype: LocalDtype;
}

export interface AsrTranscribeRequest {
  type: "transcribe";
  /** 16 kHz mono PCM. */
  audio: Float32Array;
  /** Correlates the reply with the request (partial vs final). */
  requestId: number;
}

export type AsrWorkerRequest = AsrLoadRequest | AsrTranscribeRequest;

export type AsrWorkerResponse =
  | { type: "progress"; loadedMb: number; totalMb: number }
  | { type: "ready" }
  | { type: "transcript"; text: string; requestId: number }
  | { type: "error"; message: string; requestId?: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: any = null;

const post = (msg: AsrWorkerResponse) => self.postMessage(msg);

function friendlyError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const lower = raw.toLowerCase();
  if (lower.includes("out of memory") || lower.includes("allocation")) {
    return "This device ran out of memory loading the speech model. Try the smaller Tiny model, or close other tabs.";
  }
  if (lower.includes("fetch") || lower.includes("network")) {
    return "The speech-model download was interrupted. Check your connection and try again.";
  }
  return `The speech model failed to load: ${raw.slice(0, 200)}`;
}

async function handleLoad(req: AsrLoadRequest) {
  try {
    const files = new Map<string, { loaded: number; total: number }>();
    transcriber = await pipeline("automatic-speech-recognition", req.hfId, {
      device: req.device,
      dtype: req.dtype,
      progress_callback: (info: {
        status: string;
        file?: string;
        loaded?: number;
        total?: number;
      }) => {
        if (info.status === "progress" && info.file) {
          files.set(info.file, {
            loaded: info.loaded ?? 0,
            total: info.total ?? 0,
          });
          let loaded = 0;
          let total = 0;
          for (const f of files.values()) {
            loaded += f.loaded;
            total += f.total;
          }
          post({
            type: "progress",
            loadedMb: loaded / 1024 / 1024,
            totalMb: total / 1024 / 1024,
          });
        }
      },
    });
    post({ type: "ready" });
  } catch (e) {
    transcriber = null;
    post({ type: "error", message: friendlyError(e) });
  }
}

async function handleTranscribe(req: AsrTranscribeRequest) {
  if (!transcriber) {
    post({ type: "error", message: "The speech model isn't loaded yet.", requestId: req.requestId });
    return;
  }
  try {
    const out = await transcriber(req.audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    const text = Array.isArray(out)
      ? out.map((o: { text?: string }) => o.text ?? "").join(" ")
      : (out?.text ?? "");
    post({ type: "transcript", text: String(text).trim(), requestId: req.requestId });
  } catch (e) {
    console.error("[asrWorker] transcribe failed:", e);
    post({
      type: "error",
      message: `Transcription failed: ${e instanceof Error ? e.message : String(e)}`,
      requestId: req.requestId,
    });
  }
}

self.addEventListener("message", (event: MessageEvent<AsrWorkerRequest>) => {
  const msg = event.data;
  if (msg.type === "load") void handleLoad(msg);
  else if (msg.type === "transcribe") void handleTranscribe(msg);
});
