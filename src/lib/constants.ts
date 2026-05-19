export const APP_NAME = "NeoScribe";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export const EXTRACTION_CATEGORIES = [
  "history_present_illness",
  "review_of_systems",
  "past_medical_history",
  "medications",
  "allergies",
  "physical_exam",
  "assessment_and_plan",
] as const;

export type ExtractionCategory = (typeof EXTRACTION_CATEGORIES)[number];
