import type { ExtractionCategory } from "@/lib/constants";

export type ModelLocation = "cloud" | "edge";
export type ModelStatus = "online" | "loading" | "offline";
export type ModelCapability = "text" | "audio" | "vision" | "function_calling";

export interface Model {
  id: string;
  name: string;
  location: ModelLocation;
  status: ModelStatus;
  sizeLabel: string;
  provider: string;
  capabilities: ModelCapability[];
  endpoint?: string;
  sizeMb?: number;
  lastCheckedAt: string;
}

export interface ModelHealth {
  id: string;
  status: ModelStatus;
  latencyMs: number | null;
  lastCheckedAt: string;
}

export interface ExtractionResult {
  modelId: string;
  category: ExtractionCategory;
  text: string;
  confidence: number;
}

export interface ExtractionResponse {
  modelId: string;
  startedAt: string;
  completedAt: string;
  results: ExtractionResult[];
}

const BASE_MODELS: Omit<Model, "lastCheckedAt">[] = [
  {
    id: "qwen-2.5-7b",
    name: "Qwen 2.5 7B",
    location: "cloud",
    status: "online",
    sizeLabel: "7B",
    provider: "huggingface",
    capabilities: ["text", "function_calling"],
    endpoint: "https://huggingface.co/Qwen/Qwen2.5-7B-Instruct",
  },
  {
    id: "gemma-4-26b-a4b",
    name: "Gemma 4 26B (A4B)",
    location: "cloud",
    status: "online",
    sizeLabel: "26B MoE",
    provider: "huggingface",
    capabilities: ["text", "vision", "function_calling"],
    endpoint: "https://huggingface.co/google/gemma-4-26b-a4b",
  },
  {
    id: "medgemma-27b",
    name: "MedGemma 27B",
    location: "cloud",
    status: "loading",
    sizeLabel: "27B",
    provider: "huggingface",
    capabilities: ["text", "vision"],
    endpoint: "https://huggingface.co/google/medgemma-27b",
  },
  {
    id: "gemma-4-e4b",
    name: "Gemma 4 E4B",
    location: "edge",
    status: "online",
    sizeLabel: "E4B",
    provider: "ollama",
    capabilities: ["text", "audio"],
    sizeMb: 2500,
  },
  {
    id: "medgemma-4b",
    name: "MedGemma 4B",
    location: "edge",
    status: "online",
    sizeLabel: "4B",
    provider: "ollama",
    capabilities: ["text"],
    sizeMb: 3000,
  },
];

export function getMockModels(): Model[] {
  const now = new Date().toISOString();
  return BASE_MODELS.map((m) => ({ ...m, lastCheckedAt: now }));
}

export const MOCK_MODELS: Model[] = getMockModels();

export function mockModelHealth(id: string): ModelHealth {
  const model = BASE_MODELS.find((m) => m.id === id);
  return {
    id,
    status: model?.status ?? "offline",
    latencyMs:
      model?.status === "online" ? Math.round(120 + Math.random() * 380) : null,
    lastCheckedAt: new Date().toISOString(),
  };
}

export function mockExtraction(id: string): ExtractionResponse {
  const now = new Date();
  const started = new Date(now.getTime() - 1400);
  return {
    modelId: id,
    startedAt: started.toISOString(),
    completedAt: now.toISOString(),
    results: [
      {
        modelId: id,
        category: "history_present_illness",
        text: "Patient presents with a 3-day history of productive cough and low-grade fever.",
        confidence: 0.92,
      },
      {
        modelId: id,
        category: "medications",
        text: "Lisinopril 10 mg daily; Atorvastatin 20 mg nightly.",
        confidence: 0.88,
      },
      {
        modelId: id,
        category: "assessment_and_plan",
        text: "Acute bronchitis — supportive care, follow-up in 1 week if not improving.",
        confidence: 0.81,
      },
    ],
  };
}
