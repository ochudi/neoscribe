"use client";

import { extractWithCloudModel, recordRun } from "@/lib/api/client";
import { getLocalModel } from "@/lib/local/catalog";
import { generate, LocalModelError } from "@/lib/local/engine";
import {
  FULL_PREFILL,
  SIMPLE_PREFILL,
  buildExtractionPrompt,
  buildSimpleExtractionPrompt,
  extractJsonBlock,
  hasExpectedShape,
  toExtractionResult,
} from "@/lib/local/extraction";
import type { ExtractionResult, Model, RunInputType } from "@/lib/api/types";

export interface RunCallbacks {
  /** Streaming output chunk (on-device models only). */
  onToken?: (chunk: string, tps: number) => void;
}

/**
 * Run one extraction on either runtime. Cloud runs are persisted by the
 * server; on-device runs are recorded afterwards (best effort — the result
 * still returns if saving fails).
 */
export async function runExtraction(
  model: Model,
  input: string,
  inputType: RunInputType,
  callbacks: RunCallbacks = {}
): Promise<ExtractionResult> {
  if (model.runtime === "cloud") {
    return extractWithCloudModel(model.id, { transcript: input, inputType });
  }

  const def = getLocalModel(model.id);
  if (!def) {
    throw new LocalModelError(`Unknown on-device model: ${model.id}`, false);
  }

  const startedAt = new Date().toISOString();
  const simple = def.promptStyle === "simple";
  const prompt = simple
    ? buildSimpleExtractionPrompt(input)
    : buildExtractionPrompt(input);
  const output = await generate(model.id, prompt, {
    maxNewTokens: simple ? 500 : 900,
    prefill: simple ? SIMPLE_PREFILL : FULL_PREFILL,
    onToken: callbacks.onToken,
  });
  const completedAt = new Date().toISOString();

  const parsed = extractJsonBlock(output.text);
  if (!parsed || !hasExpectedShape(parsed)) {
    throw new LocalModelError(
      `${model.name} lost the expected format mid-answer — this happens with small models now and then. Run it again, or try a slightly larger model.`
    );
  }

  const extraction = toExtractionResult(model.id, parsed, startedAt, completedAt);

  try {
    const saved = await recordRun({
      modelId: model.id,
      modelName: model.name,
      modelSizeLabel: model.sizeLabel,
      runtime: "device",
      inputType,
      input,
      extraction,
      durationMs:
        new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    });
    extraction.runId = saved.id;
  } catch {
    // History save failed (offline?) — the extraction itself still succeeded.
  }

  return extraction;
}
