"use client";

// Controller for on-device inference. Owns a single web worker (one loaded
// model at a time — these models eat RAM) and exposes per-model state through
// a zustand store the UI can subscribe to.

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getLocalModel } from "@/lib/local/catalog";
import { assessFit, getDeviceProfile } from "@/lib/local/device";
import type { WorkerResponse } from "@/lib/local/worker";

export type LocalRunState =
  | "idle"
  | "downloading"
  | "loading"
  | "ready"
  | "generating"
  | "error";

export interface LocalModelRuntime {
  status: LocalRunState;
  progress?: { loadedMb: number; totalMb: number };
  error?: string;
  tps?: number;
  backend?: "webgpu" | "wasm";
}

interface LocalEngineStore {
  states: Record<string, LocalModelRuntime>;
  /** Models fully downloaded at least once on this browser (cache hint). */
  downloaded: Record<string, boolean>;
  /** Model currently loaded in the worker (only one at a time). */
  activeModelId: string | null;
  setState: (modelId: string, patch: Partial<LocalModelRuntime>) => void;
  resetState: (modelId: string) => void;
  markDownloaded: (modelId: string, value: boolean) => void;
  setActive: (modelId: string | null) => void;
}

export const useLocalEngineStore = create<LocalEngineStore>()(
  persist(
    (set) => ({
      states: {},
      downloaded: {},
      activeModelId: null,
      setState: (modelId, patch) =>
        set((s) => ({
          states: {
            ...s.states,
            [modelId]: {
              ...(s.states[modelId] ?? { status: "idle" as const }),
              ...patch,
            },
          },
        })),
      resetState: (modelId) =>
        set((s) => ({
          states: { ...s.states, [modelId]: { status: "idle" } },
        })),
      markDownloaded: (modelId, value) =>
        set((s) => ({ downloaded: { ...s.downloaded, [modelId]: value } })),
      setActive: (modelId) => set({ activeModelId: modelId }),
    }),
    {
      name: "neoscribe-local-models-v1",
      partialize: (s) => ({ downloaded: s.downloaded }),
    }
  )
);

let worker: Worker | null = null;
let workerModelId: string | null = null;
let generateBusy = false;

function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  const previous = workerModelId;
  workerModelId = null;
  generateBusy = false;
  const store = useLocalEngineStore.getState();
  if (previous) {
    store.setState(previous, {
      status: "idle",
      progress: undefined,
    });
  }
  store.setActive(null);
}

export class LocalModelError extends Error {
  constructor(message: string, public retryable = true) {
    super(message);
    this.name = "LocalModelError";
  }
}

/**
 * Make sure `modelId` is downloaded and loaded in the worker, reporting
 * progress through the store. Loading a different model unloads the previous
 * one first.
 */
export async function ensureLoaded(modelId: string): Promise<void> {
  const def = getLocalModel(modelId);
  if (!def) throw new LocalModelError(`Unknown on-device model: ${modelId}`, false);

  const store = useLocalEngineStore.getState();
  if (workerModelId === modelId && worker) {
    const st = useLocalEngineStore.getState().states[modelId];
    if (st?.status === "ready" || st?.status === "generating") return;
  }

  const profile = await getDeviceProfile();
  const fit = assessFit(def, profile);
  if (fit.verdict === "blocked") {
    store.setState(modelId, { status: "error", error: fit.notes[0] });
    throw new LocalModelError(fit.notes.join(" "), false);
  }

  // One model at a time: unload whatever is currently active.
  if (worker && workerModelId !== modelId) terminateWorker();

  const alreadyCached = !!store.downloaded[modelId];
  store.setState(modelId, {
    status: alreadyCached ? "loading" : "downloading",
    backend: fit.backend,
    error: undefined,
    progress: undefined,
  });
  store.setActive(modelId);

  worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });
  workerModelId = modelId;

  await new Promise<void>((resolve, reject) => {
    if (!worker) return reject(new LocalModelError("Worker unavailable."));
    const w = worker;

    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;
      const s = useLocalEngineStore.getState();
      if (msg.type === "progress") {
        s.setState(modelId, {
          status: "downloading",
          progress: { loadedMb: msg.loadedMb, totalMb: msg.totalMb },
        });
      } else if (msg.type === "ready") {
        w.removeEventListener("message", onMessage);
        s.setState(modelId, { status: "ready", progress: undefined });
        s.markDownloaded(modelId, true);
        resolve();
      } else if (msg.type === "error") {
        w.removeEventListener("message", onMessage);
        s.setState(modelId, { status: "error", error: msg.message });
        terminateWorker();
        reject(new LocalModelError(msg.message));
      }
    };

    const onError = (e: ErrorEvent) => {
      w.removeEventListener("message", onMessage);
      const message = `The on-device runtime crashed while loading: ${e.message || "unknown error"}`;
      useLocalEngineStore.getState().setState(modelId, { status: "error", error: message });
      terminateWorker();
      reject(new LocalModelError(message));
    };

    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError, { once: true });
    w.postMessage({
      type: "load",
      hfId: def.hfId,
      device: fit.backend,
      dtype: def.dtype[fit.backend],
    });
  });
}

export interface GenerateOutput {
  text: string;
  tps: number;
  numTokens: number;
}

/** Stream tokens from the loaded model. Rejects if another run is in flight. */
export async function generate(
  modelId: string,
  prompt: string,
  opts: {
    maxNewTokens?: number;
    prefill?: string;
    onToken?: (chunk: string, tps: number) => void;
  } = {}
): Promise<GenerateOutput> {
  if (generateBusy) {
    throw new LocalModelError(
      "An on-device model is already generating. Wait for it to finish — this hardware runs one model at a time."
    );
  }
  await ensureLoaded(modelId);
  if (!worker || workerModelId !== modelId) {
    throw new LocalModelError("The model unloaded unexpectedly. Try again.");
  }

  const store = useLocalEngineStore.getState();
  generateBusy = true;
  store.setState(modelId, { status: "generating", tps: undefined });

  try {
    return await new Promise<GenerateOutput>((resolve, reject) => {
      const w = worker!;
      const onMessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        const s = useLocalEngineStore.getState();
        if (msg.type === "token") {
          s.setState(modelId, { status: "generating", tps: msg.tps });
          opts.onToken?.(msg.text, msg.tps);
        } else if (msg.type === "complete") {
          w.removeEventListener("message", onMessage);
          s.setState(modelId, { status: "ready", tps: msg.tps });
          resolve({ text: msg.text, tps: msg.tps, numTokens: msg.numTokens });
        } else if (msg.type === "error") {
          w.removeEventListener("message", onMessage);
          s.setState(modelId, { status: "error", error: msg.message });
          reject(new LocalModelError(msg.message));
        }
      };
      w.addEventListener("message", onMessage);
      w.postMessage({
        type: "generate",
        prompt,
        maxNewTokens: opts.maxNewTokens ?? 800,
        prefill: opts.prefill,
      });
    });
  } finally {
    generateBusy = false;
  }
}

/** Ask the current generation to stop after the next token. */
export function interrupt() {
  worker?.postMessage({ type: "interrupt" });
}

/** Unload the active model and free its memory. */
export function unload() {
  terminateWorker();
}

/** Remove a model's files from the browser cache. */
export async function removeDownload(modelId: string): Promise<void> {
  const def = getLocalModel(modelId);
  if (!def) return;
  if (workerModelId === modelId) terminateWorker();
  try {
    const cache = await caches.open("transformers-cache");
    const keys = await cache.keys();
    await Promise.all(
      keys
        .filter((req) => req.url.includes(def.hfId))
        .map((req) => cache.delete(req))
    );
  } catch {
    // Cache API unavailable — nothing stored to remove.
  }
  const store = useLocalEngineStore.getState();
  store.markDownloaded(modelId, false);
  store.resetState(modelId);
}
