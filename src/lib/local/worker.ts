/// <reference lib="webworker" />
// Web worker that owns the transformers.js pipeline for one on-device model.
// All heavy work (download, compile, token generation) happens here so the UI
// thread never blocks.

import {
  pipeline,
  TextStreamer,
  InterruptableStoppingCriteria,
  type TextGenerationPipeline,
} from "@huggingface/transformers";

import type { LocalDtype } from "@/lib/local/catalog";

export interface LoadRequest {
  type: "load";
  hfId: string;
  device: "webgpu" | "wasm";
  dtype: LocalDtype;
}

export interface GenerateRequest {
  type: "generate";
  prompt: string;
  maxNewTokens: number;
  /**
   * Text appended after the chat template's generation marker, so the model
   * continues from inside the expected output (e.g. an opening JSON brace).
   * Echoed back at the start of the final text.
   */
  prefill?: string;
}

export interface InterruptRequest {
  type: "interrupt";
}

export type WorkerRequest = LoadRequest | GenerateRequest | InterruptRequest;

export type WorkerResponse =
  | { type: "progress"; file: string; loadedMb: number; totalMb: number }
  | { type: "ready" }
  | { type: "token"; text: string; tps: number }
  | { type: "complete"; text: string; tps: number; numTokens: number }
  | { type: "error"; message: string };

let generator: TextGenerationPipeline | null = null;
let stoppingCriteria = new InterruptableStoppingCriteria();

const post = (msg: WorkerResponse) => self.postMessage(msg);

function friendlyLoadError(e: unknown, device: string): string {
  const raw = e instanceof Error ? e.message : String(e);
  const lower = raw.toLowerCase();
  if (lower.includes("out of memory") || lower.includes("allocation")) {
    return "This device ran out of memory while loading the model. Close other tabs and try again, or pick a smaller model.";
  }
  if (lower.includes("fetch") || lower.includes("network")) {
    return "The model download was interrupted. Check your connection and try again — it resumes from the browser cache.";
  }
  if (device === "webgpu" && (lower.includes("webgpu") || lower.includes("adapter") || lower.includes("device"))) {
    return "The graphics driver refused to load this model (WebGPU error). Reloading the page or updating the browser usually fixes this.";
  }
  return `The model failed to load: ${raw.slice(0, 200)}`;
}

async function handleLoad(req: LoadRequest) {
  try {
    // Track per-file progress and report an aggregate downloaded/total figure.
    const files = new Map<string, { loaded: number; total: number }>();
    generator = await pipeline("text-generation", req.hfId, {
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
            file: info.file,
            loadedMb: loaded / 1024 / 1024,
            totalMb: total / 1024 / 1024,
          });
        }
      },
    });
    post({ type: "ready" });
  } catch (e) {
    generator = null;
    post({ type: "error", message: friendlyLoadError(e, req.device) });
  }
}

async function handleGenerate(req: GenerateRequest) {
  if (!generator) {
    post({ type: "error", message: "The model isn't loaded yet." });
    return;
  }
  try {
    stoppingCriteria = new InterruptableStoppingCriteria();
    let numTokens = 0;
    let startedAt = 0;
    let tps = 0;

    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text: string) => {
        if (numTokens === 0) startedAt = performance.now();
        numTokens += 1;
        const elapsedS = (performance.now() - startedAt) / 1000;
        tps = elapsedS > 0 ? numTokens / elapsedS : 0;
        post({ type: "token", text, tps });
      },
    });

    const prefill = req.prefill ?? "";
    // enable_thinking: Qwen3's template honours it and skips its reasoning
    // preamble; other templates simply ignore the extra kwarg.
    const templateOptions = {
      tokenize: false,
      add_generation_prompt: true,
      enable_thinking: false,
    } as Parameters<typeof generator.tokenizer.apply_chat_template>[1];
    const rendered =
      (generator.tokenizer.apply_chat_template(
        [{ role: "user", content: req.prompt }],
        templateOptions
      ) as string) + prefill;

    const output = await generator(rendered, {
      max_new_tokens: req.maxNewTokens,
      do_sample: false,
      return_full_text: false,
      streamer,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stopping_criteria: stoppingCriteria as any,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const last = (output[0] as any)?.generated_text;
    const text =
      prefill +
      (Array.isArray(last) ? (last.at(-1)?.content ?? "") : String(last ?? ""));
    post({ type: "complete", text, tps, numTokens });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const lower = raw.toLowerCase();
    post({
      type: "error",
      message:
        lower.includes("out of memory") || lower.includes("allocation")
          ? "The device ran out of memory mid-generation. Close other tabs or pick a smaller model."
          : `Generation failed: ${raw.slice(0, 200)}`,
    });
  }
}

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type === "load") void handleLoad(msg);
  else if (msg.type === "generate") void handleGenerate(msg);
  else if (msg.type === "interrupt") stoppingCriteria.interrupt();
});
