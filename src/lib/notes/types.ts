import type { ModelRuntime } from "@/lib/api/types";

/** A vital sign, e.g. { label: "BP", value: "140/90 mmHg" }. */
export interface NoteVital {
  label: string;
  value: string;
}

/** A system-by-system examination finding, e.g. Respiratory / CVS / Abdomen. */
export interface NoteSystem {
  name: string;
  findings: string;
}

export interface NoteExamination {
  /** General inspection — "Chronically ill-looking man, febrile, pale…". */
  general: string;
  vitals: NoteVital[];
  systems: NoteSystem[];
}

/**
 * A narrative clinical note in clerking/SOAP house style. Prose fields read as
 * sentences; list fields are short items. Built from any model's output via the
 * note prompt, or synthesised from a plain ExtractionResult.
 */
export interface ClinicalNote {
  modelId: string;
  modelName: string;
  /** "cloud" | "device" — drives the privacy note and labelling. */
  runtime: ModelRuntime;
  startedAt: string;
  completedAt: string;

  /** One-line synopsis of who the patient is and why they presented. */
  patientSummary: string;
  presentingComplaints: string[];
  /** History of presenting complaint, as prose. */
  history: string;
  /** Past medical & surgical history, as prose. */
  pastHistory: string;
  /** Current medications. */
  medications: string[];
  socialFamilyHistory: string;
  examination: NoteExamination;
  /** Investigations requested or already available. */
  investigations: string[];
  /** Assessment / impression, as prose (may carry differentials). */
  assessment: string;
  /** Management plan — investigations, prescriptions, follow-up. */
  plan: string[];
  /** Model-suggested next steps, kept distinct from the clinician's own plan. */
  recommendations: string[];

  /** Whether the prose was authored by the model or synthesised from findings. */
  source: "model" | "synthesised";
  /** Server id of the persisted note, when saved. */
  noteId?: string;
}

/** A persisted note as returned by the API. */
export interface SavedNote {
  id: string;
  savedAt: string;
  modelId: string;
  modelName: string;
  runtime: ModelRuntime;
  /** How the transcript was captured. */
  source: "recorded" | "pasted";
  inputType: string;
  transcript: string;
  note: ClinicalNote;
}

/** True when a note carries any clinically meaningful content. */
export function noteHasContent(note: ClinicalNote): boolean {
  return (
    note.patientSummary.trim().length > 0 ||
    note.presentingComplaints.length > 0 ||
    note.history.trim().length > 0 ||
    note.assessment.trim().length > 0 ||
    note.plan.length > 0 ||
    note.medications.length > 0 ||
    note.investigations.length > 0
  );
}
