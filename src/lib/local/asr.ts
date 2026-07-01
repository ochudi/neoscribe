"use client";

// Controller for on-device speech-to-text. Owns a single Whisper worker and
// exposes per-model state through a zustand store the UI subscribes to. Runs on
// the CPU (WASM) backend for now — reliable across browsers and fast enough for
// Tiny/Base; a WebGPU path and a cloud fallback can slot in behind transcribe().

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getAsrModel } from "@/lib/local/asrCatalog";
import type { AsrWorkerResponse } from "@/lib/local/asrWorker";

export type AsrRunState =
  | "idle"
  | "downloading"
  | "loading"
  | "ready"
  | "transcribing"
  | "error";

export interface AsrRuntime {
  status: AsrRunState;
  progress?: { loadedMb: number; totalMb: number };
  error?: string;
}

interface AsrStore {
  states: Record<string, AsrRuntime>;
  downloaded: Record<string, boolean>;
  activeModelId: string | null;
  setState: (id: string, patch: Partial<AsrRuntime>) => void;
  markDownloaded: (id: string, value: boolean) => void;
  setActive: (id: string | null) => void;
}

export const useAsrStore = create<AsrStore>()(
  persist(
    (set) => ({
      states: {},
      downloaded: {},
      activeModelId: null,
      setState: (id, patch) =>
        set((s) => ({
          states: {
            ...s.states,
            [id]: { ...(s.states[id] ?? { status: "idle" as const }), ...patch },
          },
        })),
      markDownloaded: (id, value) =>
        set((s) => ({ downloaded: { ...s.downloaded, [id]: value } })),
      setActive: (id) => set({ activeModelId: id }),
    }),
    {
      name: "neoscribe-asr-models-v1",
      partialize: (s) => ({ downloaded: s.downloaded }),
    }
  )
);

export class AsrError extends Error {
  constructor(message: string, public retryable = true) {
    super(message);
    this.name = "AsrError";
  }
}

let worker: Worker | null = null;
let workerModelId: string | null = null;
let requestSeq = 0;
const pending = new Map<
  number,
  { resolve: (text: string) => void; reject: (e: Error) => void }
>();

function terminate() {
  worker?.terminate();
  worker = null;
  workerModelId = null;
  for (const { reject } of pending.values()) {
    reject(new AsrError("Transcription was cancelled."));
  }
  pending.clear();
  useAsrStore.getState().setActive(null);
}

function rejectAllPending(message: string) {
  for (const { reject } of pending.values()) reject(new AsrError(message));
  pending.clear();
}

function attachTranscribeListener(w: Worker) {
  w.addEventListener("message", (event: MessageEvent<AsrWorkerResponse>) => {
    const msg = event.data;
    if (msg.type === "transcript") {
      pending.get(msg.requestId)?.resolve(msg.text);
      pending.delete(msg.requestId);
    } else if (msg.type === "error" && msg.requestId !== undefined) {
      pending.get(msg.requestId)?.reject(new AsrError(msg.message));
      pending.delete(msg.requestId);
    }
  });
  // Persistent crash handler: without this, a worker that dies mid-transcription
  // (e.g. out of memory) posts nothing back and the transcribe promise hangs
  // forever — the "nothing happens" failure mode.
  w.addEventListener("error", (e: ErrorEvent) => {
    const message = `The speech runtime crashed during transcription: ${e.message || "unknown error"}. Try the smaller Whisper Tiny model or a shorter recording.`;
    console.error("[asr] worker error:", e.message || e);
    if (workerModelId) {
      useAsrStore.getState().setState(workerModelId, { status: "error", error: message });
    }
    rejectAllPending(message);
    terminate();
  });
}

/** Ensure the Whisper model is downloaded and loaded in the worker. */
export async function ensureAsrLoaded(modelId: string): Promise<void> {
  const def = getAsrModel(modelId);
  if (!def) throw new AsrError(`Unknown speech model: ${modelId}`, false);

  if (worker && workerModelId === modelId) {
    const st = useAsrStore.getState().states[modelId];
    if (st?.status === "ready" || st?.status === "transcribing") return;
  }
  if (worker && workerModelId !== modelId) terminate();

  const store = useAsrStore.getState();
  const cached = !!store.downloaded[modelId];
  store.setState(modelId, {
    status: cached ? "loading" : "downloading",
    error: undefined,
    progress: undefined,
  });
  store.setActive(modelId);

  worker = new Worker(new URL("./asrWorker.ts", import.meta.url), {
    type: "module",
  });
  workerModelId = modelId;
  const w = worker;

  await new Promise<void>((resolve, reject) => {
    const onMessage = (event: MessageEvent<AsrWorkerResponse>) => {
      const msg = event.data;
      const s = useAsrStore.getState();
      if (msg.type === "progress") {
        s.setState(modelId, {
          status: "downloading",
          progress: { loadedMb: msg.loadedMb, totalMb: msg.totalMb },
        });
      } else if (msg.type === "ready") {
        w.removeEventListener("message", onMessage);
        s.setState(modelId, { status: "ready", progress: undefined });
        s.markDownloaded(modelId, true);
        attachTranscribeListener(w);
        resolve();
      } else if (msg.type === "error") {
        w.removeEventListener("message", onMessage);
        s.setState(modelId, { status: "error", error: msg.message });
        terminate();
        reject(new AsrError(msg.message));
      }
    };
    const onError = (e: ErrorEvent) => {
      w.removeEventListener("message", onMessage);
      const message = `The speech runtime crashed while loading: ${e.message || "unknown error"}`;
      useAsrStore.getState().setState(modelId, { status: "error", error: message });
      terminate();
      reject(new AsrError(message));
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError, { once: true });
    w.postMessage({
      type: "load",
      hfId: def.hfId,
      device: "wasm",
      dtype: def.dtype,
    });
  });
}

// Serialise transcription — the worker holds one Whisper instance that isn't
// safe to call re-entrantly, and near-live + final passes can otherwise race.
let chain: Promise<unknown> = Promise.resolve();

/** Transcribe a 16 kHz mono audio snapshot. Loads the model first if needed. */
export function transcribe(
  modelId: string,
  audio: Float32Array
): Promise<string> {
  const run = chain.then(() => doTranscribe(modelId, audio));
  chain = run.catch(() => {});
  return run;
}

async function doTranscribe(
  modelId: string,
  audio: Float32Array
): Promise<string> {
  await ensureAsrLoaded(modelId);
  if (!worker || workerModelId !== modelId) {
    throw new AsrError("The speech model unloaded unexpectedly. Try again.");
  }
  const w = worker;
  const store = useAsrStore.getState();
  store.setState(modelId, { status: "transcribing" });

  const requestId = ++requestSeq;
  // Copy so the transfer doesn't neuter the caller's buffer (near-live reuses it).
  const copy = audio.slice();
  try {
    return await new Promise<string>((resolve, reject) => {
      // Watchdog so a stuck worker surfaces an error instead of hanging silently.
      const timeout = setTimeout(() => {
        pending.delete(requestId);
        reject(
          new AsrError(
            "Transcription is taking unusually long on this device — it may be running single-threaded on the CPU. Try the smaller Whisper Tiny model or a shorter recording.",
            true
          )
        );
      }, 240_000);
      pending.set(requestId, {
        resolve: (t) => {
          clearTimeout(timeout);
          resolve(t);
        },
        reject: (e) => {
          clearTimeout(timeout);
          reject(e);
        },
      });
      w.postMessage({ type: "transcribe", audio: copy, requestId }, [copy.buffer]);
    });
  } finally {
    if (useAsrStore.getState().states[modelId]?.status === "transcribing") {
      useAsrStore.getState().setState(modelId, { status: "ready" });
    }
  }
}

/** Unload the Whisper model and free its memory. */
export function unloadAsr() {
  const id = workerModelId;
  terminate();
  if (id) useAsrStore.getState().setState(id, { status: "idle", progress: undefined });
}
