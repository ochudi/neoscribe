/**
 * On-device model catalog. Every entry is an ONNX build verified to exist on
 * the Hugging Face Hub. Sizes are the real download sizes per backend
 * (WebGPU uses 4-bit float16 weights, CPU/WASM uses 8-bit integer weights).
 */
/** Quantisations we ship — must match the ONNX files present on the Hub. */
export type LocalDtype = "q4f16" | "q4" | "q8" | "int8" | "fp16" | "fp32";

export interface LocalModelDef {
  id: string;
  name: string;
  hfId: string;
  provider: string;
  sizeLabel: string;
  description: string;
  /** Billions of parameters — used for speed heuristics. */
  paramsB: number;
  dtype: { webgpu: LocalDtype; wasm: LocalDtype };
  downloadMb: { webgpu: number; wasm: number };
  /** Approximate memory needed while running, in GB. */
  minRamGb: number;
  /** Comfortable on a recent phone? Drives the fit assessment copy. */
  phoneFriendly: boolean;
  /**
   * "full" asks for {text, code} objects (capable models); "simple" asks tiny
   * models for plain string arrays — they can't code reliably anyway, and the
   * simpler shape keeps their output parseable.
   */
  promptStyle: "full" | "simple";
  /**
   * Requires GPU acceleration: quality collapses (and speed is unusable) on
   * the CPU fallback, so we refuse to run it without WebGPU.
   */
  webgpuOnly?: boolean;
}

export const LOCAL_MODELS: LocalModelDef[] = [
  {
    id: "smollm2-135m",
    name: "SmolLM2 135M",
    hfId: "HuggingFaceTB/SmolLM2-135M-Instruct",
    provider: "Hugging Face",
    sizeLabel: "135M",
    description:
      "The smallest model here — runs on almost anything, including phones. Expect rough edges; that's the point of comparing.",
    paramsB: 0.135,
    dtype: { webgpu: "q4f16", wasm: "int8" },
    downloadMb: { webgpu: 112, wasm: 131 },
    minRamGb: 1,
    phoneFriendly: true,
    promptStyle: "simple",
  },
  {
    id: "gemma-3-270m",
    name: "Gemma 3 270M",
    hfId: "onnx-community/gemma-3-270m-it-ONNX",
    provider: "Google",
    sizeLabel: "270M",
    description:
      "Google's tiniest Gemma, tuned for instruction following. Light enough for most phones.",
    paramsB: 0.27,
    dtype: { webgpu: "q4f16", wasm: "q4" },
    downloadMb: { webgpu: 260, wasm: 308 },
    minRamGb: 1.5,
    phoneFriendly: true,
    promptStyle: "simple",
  },
  {
    id: "smollm2-360m",
    name: "SmolLM2 360M",
    hfId: "HuggingFaceTB/SmolLM2-360M-Instruct",
    provider: "Hugging Face",
    sizeLabel: "360M",
    description:
      "A clear step up from 135M while staying small enough for modest laptops and recent phones.",
    paramsB: 0.36,
    dtype: { webgpu: "q4f16", wasm: "int8" },
    downloadMb: { webgpu: 260, wasm: 348 },
    minRamGb: 2,
    phoneFriendly: true,
    promptStyle: "simple",
  },
  {
    id: "qwen-2.5-0.5b",
    name: "Qwen 2.5 0.5B",
    hfId: "onnx-community/Qwen2.5-0.5B-Instruct",
    provider: "Alibaba",
    sizeLabel: "0.5B",
    description:
      "Strong structure-following for its size — usually the best of the sub-1B pack at this task.",
    paramsB: 0.5,
    dtype: { webgpu: "q4f16", wasm: "int8" },
    downloadMb: { webgpu: 461, wasm: 488 },
    minRamGb: 2,
    phoneFriendly: true,
    promptStyle: "full",
  },
  {
    id: "qwen-3-0.6b",
    name: "Qwen 3 0.6B",
    hfId: "onnx-community/Qwen3-0.6B-ONNX",
    provider: "Alibaba",
    sizeLabel: "0.6B",
    description:
      "The newest small Qwen. A touch heavier, noticeably more careful with clinical wording.",
    paramsB: 0.6,
    dtype: { webgpu: "q4f16", wasm: "int8" },
    downloadMb: { webgpu: 543, wasm: 589 },
    minRamGb: 2.5,
    phoneFriendly: false,
    promptStyle: "full",
  },
  {
    id: "llama-3.2-1b",
    name: "Llama 3.2 1B",
    hfId: "onnx-community/Llama-3.2-1B-Instruct",
    provider: "Meta",
    sizeLabel: "1B",
    description:
      "Meta's edge-class Llama — among the most capable on-device options, best on a laptop or desktop.",
    paramsB: 1.0,
    dtype: { webgpu: "q4f16", wasm: "int8" },
    downloadMb: { webgpu: 1039, wasm: 1179 },
    minRamGb: 4,
    phoneFriendly: false,
    promptStyle: "full",
    webgpuOnly: true,
  },
  {
    id: "gemma-3-1b",
    name: "Gemma 3 1B",
    hfId: "onnx-community/gemma-3-1b-it-ONNX-GQA",
    provider: "Google",
    sizeLabel: "1B",
    description:
      "Google's Gemma 3 at 1B — a strong, careful on-device all-rounder for clinical notes. General purpose, not medically tuned. Best on a laptop or desktop with WebGPU.",
    paramsB: 1.0,
    dtype: { webgpu: "q4f16", wasm: "q4" },
    downloadMb: { webgpu: 770, wasm: 860 },
    minRamGb: 4,
    phoneFriendly: false,
    promptStyle: "full",
    webgpuOnly: true,
  },
];

export function getLocalModel(id: string): LocalModelDef | undefined {
  return LOCAL_MODELS.find((m) => m.id === id);
}

export function isLocalModelId(id: string): boolean {
  return LOCAL_MODELS.some((m) => m.id === id);
}
