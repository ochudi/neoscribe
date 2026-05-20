export const APP_NAME = "NeoScribe";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export const EXTRACTION_CATEGORIES = [
  "complaints",
  "symptoms",
  "diagnoses",
  "medications",
  "investigations",
  "procedures",
  "follow_ups",
] as const;

export type ExtractionCategory = (typeof EXTRACTION_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ExtractionCategory, string> = {
  complaints: "Complaints",
  symptoms: "Symptoms",
  diagnoses: "Diagnoses",
  medications: "Medications",
  investigations: "Investigations",
  procedures: "Procedures",
  follow_ups: "Follow-ups",
};
