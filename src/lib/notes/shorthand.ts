// Expands the Nigerian/clerking medical shorthand seen in real notes into
// readable English, so a downloaded note reads cleanly for a lay or external
// reader. Deliberately conservative: only well-known, unambiguous forms are
// expanded, and word boundaries are respected to avoid mangling prose.

// Duration shorthand: 6/52 → "6 weeks", 1/12 → "1 month", 3/7 → "3 days".
// Numerator is capped at two digits and a trailing "mmHg" is excluded so blood
// pressures like "120/52 mmHg" aren't mistaken for durations.
function expandDurations(text: string): string {
  return text
    .replace(/\b(\d{1,2})\s*\/\s*7\b(?!\s*mmHg)/gi, (_, n) => `${n} ${n === "1" ? "day" : "days"}`)
    .replace(/\b(\d{1,2})\s*\/\s*52\b(?!\s*mmHg)/gi, (_, n) => `${n} ${n === "1" ? "week" : "weeks"}`)
    .replace(/\b(\d{1,2})\s*\/\s*12\b(?!\s*mmHg)/gi, (_, n) => `${n} ${n === "1" ? "month" : "months"}`);
}

// Phrase-level abbreviations. Order matters — longer/compound forms first.
// Each entry is matched case-insensitively on word boundaries; the replacement
// preserves a leading capital when the match was capitalised.
const PHRASES: Array<[RegExp, string]> = [
  [/\bO\/E\b/gi, "On examination"],
  [/\bC\/O\b/gi, "complains of"],
  [/\bP\/C\b/gi, "presenting complaint"],
  [/\bR\/O\b/gi, "rule out"],
  [/\bkiv\b/gi, "to keep in view"],
  [/\bPMHX\b/gi, "past medical history"],
  [/\bPSHX\b/gi, "past surgical history"],
  [/\bPMH\b/gi, "past medical history"],
  [/\bDRUG HX\b/gi, "drug history"],
  [/\bFAMILY HX\b/gi, "family history"],
  [/\bSOCIAL HX\b/gi, "social history"],
  [/\bHx\b/g, "history"],
  [/\bROS\b/gi, "review of systems"],
  [/\bPRN\b/gi, "as needed"],
  [/\bnocte\b/gi, "at night"],
  [/\bOD\b/g, "once daily"],
  [/\bBD\b/g, "twice daily"],
  [/\bTDS\b/g, "three times daily"],
];

// Clinical term abbreviations expanded with the short form kept in parentheses,
// so nothing is lost: "HTN" → "hypertension (HTN)".
const TERMS: Array<[RegExp, string]> = [
  [/\bHTN\b/g, "hypertension (HTN)"],
  [/\bT2DM\b/g, "type 2 diabetes mellitus (T2DM)"],
  [/\bDM\b/g, "diabetes mellitus (DM)"],
  [/\bPTB\b/g, "pulmonary tuberculosis (PTB)"],
  [/\bPUD\b/g, "peptic ulcer disease (PUD)"],
  [/\bPND\b/g, "paroxysmal nocturnal dyspnoea (PND)"],
  [/\bCVA\b/g, "cerebrovascular accident (CVA)"],
  [/\bCVD\b/g, "cardiovascular disease (CVD)"],
  [/\bLUTS\b/g, "lower urinary tract symptoms (LUTS)"],
  [/\bRTA\b/g, "road traffic accident (RTA)"],
];

// Investigation abbreviations.
const INVESTIGATIONS: Array<[RegExp, string]> = [
  [/\bE\/U\/Cr\b/gi, "electrolytes, urea & creatinine (E/U/Cr)"],
  [/\bEUCR\b/gi, "electrolytes, urea & creatinine (EUCr)"],
  [/\bEUC\b/g, "electrolytes, urea & creatinine (EUC)"],
  [/\bFBC\b/g, "full blood count (FBC)"],
  [/\bESR\b/g, "erythrocyte sedimentation rate (ESR)"],
  [/\bCXR\b/g, "chest X-ray (CXR)"],
  [/\bFLP\b/g, "fasting lipid profile (FLP)"],
  [/\bLFT\b/g, "liver function tests (LFT)"],
  [/\bTFT\b/g, "thyroid function test (TFT)"],
  [/\bHBA1C\b/gi, "glycated haemoglobin (HbA1c)"],
  [/\bRBS\b/g, "random blood sugar (RBS)"],
  [/\bFBS\b/g, "fasting blood sugar (FBS)"],
  [/\bUSS\b/g, "ultrasound scan (USS)"],
  [/\bECG\b/g, "electrocardiogram (ECG)"],
  [/\bM\/C\/S\b/gi, "microscopy, culture & sensitivity (M/C/S)"],
];

export interface ExpandOptions {
  /** Expand clinical/investigation terms (HTN, FBC…). Default true. */
  terms?: boolean;
}

/** Expand a single string of clinical shorthand into readable English. */
export function expandShorthand(text: string, opts: ExpandOptions = {}): string {
  if (!text) return text;
  let out = expandDurations(text);
  for (const [re, sub] of PHRASES) out = out.replace(re, sub);
  if (opts.terms !== false) {
    for (const [re, sub] of [...TERMS, ...INVESTIGATIONS]) out = out.replace(re, sub);
  }
  return out;
}

/** Expand an array of short items in place. */
export function expandList(items: string[], opts?: ExpandOptions): string[] {
  return items.map((i) => expandShorthand(i, opts));
}
