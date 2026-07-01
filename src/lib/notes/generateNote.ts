"use client";

import {
  ApiError,
  extractWithCloudModel,
  generateCloudNote,
} from "@/lib/api/client";
import { getLocalModel } from "@/lib/local/catalog";
import { generate, LocalModelError } from "@/lib/local/engine";
import {
  NOTE_PREFILL,
  buildNotePrompt,
  buildSimpleNotePrompt,
} from "@/lib/notes/prompt";
import { parseClinicalNote } from "@/lib/notes/parse";
import { synthesizeNote } from "@/lib/notes/synthesize";
import type { ClinicalNote } from "@/lib/notes/types";
import type { Model, RunInputType } from "@/lib/api/types";

export interface NoteCallbacks {
  /** Streaming output chunk (on-device models only). */
  onToken?: (chunk: string, tps: number) => void;
}

/**
 * Turn a transcript into a structured clinical note on either runtime.
 *
 * Cloud: calls the note endpoint; if that route isn't deployed yet (404), it
 * gracefully falls back to the extraction endpoint and synthesises a note from
 * the findings, so cloud models still produce a downloadable document.
 *
 * On-device: builds the note prompt and runs it through the local engine,
 * streaming tokens as it goes.
 */
export async function generateNote(
  model: Model,
  input: string,
  inputType: RunInputType,
  callbacks: NoteCallbacks = {}
): Promise<ClinicalNote> {
  if (model.runtime === "cloud") {
    try {
      const res = await generateCloudNote(model.id, {
        transcript: input,
        inputType,
      });
      const note = parseClinicalNote(res.content, {
        modelId: model.id,
        modelName: model.name,
        runtime: "cloud",
        startedAt: res.startedAt,
        completedAt: res.completedAt,
      });
      if (note) return note;
      throw new LocalModelError(
        `${model.name} replied in a format we couldn't read as a note. Running it again usually fixes this.`
      );
    } catch (e) {
      // Note route not deployed yet — fall back to extract + synthesise so the
      // feature still works against the current backend.
      if (e instanceof ApiError && e.status === 404) {
        const extraction = await extractWithCloudModel(model.id, {
          transcript: input,
          inputType,
        });
        return synthesizeNote(extraction, {
          modelName: model.name,
          runtime: "cloud",
        });
      }
      throw e;
    }
  }

  const def = getLocalModel(model.id);
  if (!def) {
    throw new LocalModelError(`Unknown on-device model: ${model.id}`, false);
  }

  const startedAt = new Date().toISOString();
  const simple = def.promptStyle === "simple";
  const prompt = simple ? buildSimpleNotePrompt(input) : buildNotePrompt(input);
  const output = await generate(model.id, prompt, {
    maxNewTokens: simple ? 700 : 1200,
    prefill: NOTE_PREFILL,
    onToken: callbacks.onToken,
  });
  const completedAt = new Date().toISOString();

  const note = parseClinicalNote(output.text, {
    modelId: model.id,
    modelName: model.name,
    runtime: "device",
    startedAt,
    completedAt,
  });
  if (!note) {
    throw new LocalModelError(
      `${model.name} lost the note format mid-answer — small models do this now and then. Run it again, or pick a slightly larger model.`
    );
  }
  return note;
}
