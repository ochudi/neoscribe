// Prompt for turning a transcript (or rough note) into a structured clinical
// note. Kept in sync with the cloud copy in supabase/functions/api/index.ts so
// on-device and cloud notes are comparable.

const SCHEMA = `{
  "patientSummary": string,            // one line: age, sex, and why they presented
  "presentingComplaints": string[],    // each complaint with its duration
  "history": string,                   // history of presenting complaint, as flowing prose
  "pastHistory": string,               // past medical & surgical history, as prose ("" if none)
  "medications": string[],             // current medications with dose/frequency
  "socialFamilyHistory": string,       // social & family history, as prose ("" if none)
  "examination": {
    "general": string,                 // general inspection ("" if not documented)
    "vitals": [{ "label": string, "value": string }],   // e.g. { "label": "BP", "value": "140/90 mmHg" }
    "systems": [{ "name": string, "findings": string }] // e.g. { "name": "Respiratory", "findings": "..." }
  },
  "investigations": string[],          // tests requested or results already available
  "assessment": string,                // impression / working diagnosis with differentials, as prose
  "plan": string[],                    // management steps: investigations, prescriptions, follow-up
  "recommendations": string[]          // YOUR suggested next steps, separate from the clinician's plan
}`;

export function buildNotePrompt(transcript: string): string {
  return `You are an experienced clinical scribe. Read the consultation below (a clinician-patient conversation or rough clinical note) and write a clean, well-structured clinical note.

Return ONLY a JSON object (no commentary, no markdown fences) with exactly this shape:
${SCHEMA}

Rules:
- Write prose fields ("history", "pastHistory", "socialFamilyHistory", "assessment") as clear, professional sentences a colleague could read at a glance.
- Expand medical shorthand into plain English (e.g. "6/52" -> "6 weeks", "O/E" -> "on examination", "r/o" -> "rule out", "Hx" -> "history").
- Only include what is supported by the consultation. Do not invent findings, vitals, doses, or diagnoses. Use "" for empty prose fields and [] for empty lists.
- "recommendations" is your own clinical suggestions (further questions, safety-netting, tests worth considering). Keep them clearly separate from what the clinician already planned.

Consultation:
"""
${transcript}
"""

JSON:`;
}

/**
 * Compact prompt for small on-device models: transcript first, a trimmed schema
 * last, no nested examination detail. Paired with NOTE_PREFILL.
 */
export function buildSimpleNotePrompt(transcript: string): string {
  return `Read this clinical consultation:
"""
${transcript}
"""

Now write a clinical note as JSON only (no other text). Use this exact shape, leaving "" or [] when something isn't mentioned:
{"patientSummary": "", "presentingComplaints": [], "history": "", "pastHistory": "", "medications": [], "socialFamilyHistory": "", "examination": {"general": "", "vitals": [], "systems": []}, "investigations": [], "assessment": "", "plan": [], "recommendations": []}`;
}

/** Anchors generation inside the note object, starting at the summary. */
export const NOTE_PREFILL = '{"patientSummary": "';
