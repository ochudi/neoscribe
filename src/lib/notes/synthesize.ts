import { expandList, expandShorthand } from "@/lib/notes/shorthand";
import type { ClinicalNote } from "@/lib/notes/types";
import type { ExtractionItem, ExtractionResult } from "@/lib/api/types";
import type { ModelRuntime } from "@/lib/api/types";

const texts = (items: ExtractionItem[]) => items.map((i) => i.text);

function sentenceList(items: string[]): string {
  const cleaned = items.map((i) => i.replace(/\.$/, "")).filter(Boolean);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return `${cleaned[0]}.`;
  const last = cleaned[cleaned.length - 1];
  return `${cleaned.slice(0, -1).join(", ")} and ${last}.`;
}

export interface SynthesizeMeta {
  modelName: string;
  runtime: ModelRuntime;
}

/**
 * Build a readable clinical note from a plain ExtractionResult (the 7-category
 * findings the cloud /extract route returns). Used as a graceful fallback when
 * the richer note endpoint isn't available, so cloud models still produce a
 * downloadable note. Prose here is templated, not model-authored.
 */
export function synthesizeNote(
  extraction: ExtractionResult,
  meta: SynthesizeMeta
): ClinicalNote {
  const r = extraction.results;
  const complaints = texts(r.complaints ?? []);
  const symptoms = texts(r.symptoms ?? []);
  const diagnoses = texts(r.diagnoses ?? []);
  const medications = texts(r.medications ?? []);
  const investigations = texts(r.investigations ?? []);
  const procedures = texts(r.procedures ?? []);
  const followUps = texts(r.follow_ups ?? []);

  const historyParts: string[] = [];
  if (complaints.length) {
    historyParts.push(`The patient presents with ${sentenceList(complaints)}`);
  }
  if (symptoms.length) {
    historyParts.push(`Associated symptoms include ${sentenceList(symptoms)}`);
  }

  return {
    modelId: extraction.modelId,
    modelName: meta.modelName,
    runtime: meta.runtime,
    startedAt: extraction.startedAt,
    completedAt: extraction.completedAt,
    source: "synthesised",
    patientSummary: complaints.length
      ? expandShorthand(`Patient presenting with ${sentenceList(complaints)}`)
      : "",
    presentingComplaints: expandList(complaints),
    history: expandShorthand(historyParts.join(" ")),
    pastHistory: "",
    medications: expandList(medications),
    socialFamilyHistory: "",
    examination: { general: "", vitals: [], systems: [] },
    investigations: expandList(investigations),
    assessment: diagnoses.length
      ? expandShorthand(`Working impression: ${sentenceList(diagnoses)}`)
      : "",
    plan: expandList([...procedures, ...followUps]),
    recommendations: [],
  };
}
