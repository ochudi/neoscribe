import type { LocalDtype } from "@/lib/local/catalog";

/**
 * On-device speech-to-text models (Whisper, ONNX builds on the Hugging Face
 * Hub). Kept separate from the text-generation catalog — different task,
 * different worker. English-only builds are smaller and more accurate for the
 * clinics this targets; a multilingual build can be added later.
 */
export interface AsrModelDef {
  id: string;
  name: string;
  hfId: string;
  sizeLabel: string;
  description: string;
  /** Approximate CPU (WASM) download size in MB. */
  downloadMb: number;
  minRamGb: number;
  /** Quantisation used on the WASM/CPU backend. */
  dtype: LocalDtype;
}

// NOTE on dtype: the `q8`/`q4` ONNX builds of these Whisper repos trip an
// ONNX-Runtime-web error (MatMulNBits missing weight scales), so we load the
// full-precision (fp32) weights. Larger download, but reliable across browsers.
export const ASR_MODELS: AsrModelDef[] = [
  {
    id: "whisper-tiny-en",
    name: "Whisper Tiny",
    hfId: "Xenova/whisper-tiny.en",
    sizeLabel: "tiny · EN",
    description:
      "Fastest — the default for live transcription. Good on clear English speech.",
    downloadMb: 148,
    minRamGb: 1.5,
    dtype: "fp32",
  },
  {
    id: "whisper-base-en",
    name: "Whisper Base",
    hfId: "Xenova/whisper-base.en",
    sizeLabel: "base · EN",
    description:
      "Slower but more accurate — better with accents and background noise.",
    downloadMb: 280,
    minRamGb: 2,
    dtype: "fp32",
  },
];

export function getAsrModel(id: string): AsrModelDef | undefined {
  return ASR_MODELS.find((m) => m.id === id);
}

export const DEFAULT_ASR_MODEL_ID = ASR_MODELS[0].id;
