import {
  EXTRACTION_CATEGORIES,
  type ExtractionCategory,
} from "@/lib/constants";

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

export type ExtractionMatchStatus = "matched" | "no_match";

export interface ExtractionItem {
  id: string;
  text: string;
  matchStatus: ExtractionMatchStatus;
  matchedCode?: string;
  confidence?: number;
}

export interface ExtractionResult {
  modelId: string;
  startedAt: string;
  completedAt: string;
  results: Record<ExtractionCategory, ExtractionItem[]>;
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

type FixtureItem = Omit<ExtractionItem, "id">;

const EXTRACTION_FIXTURES: Record<ExtractionCategory, FixtureItem[]> = {
  complaints: [
    {
      text: "Productive cough for 3 days",
      matchStatus: "matched",
      matchedCode: "ICD10:R05.1",
      confidence: 0.94,
    },
    {
      text: "Low-grade fever",
      matchStatus: "matched",
      matchedCode: "ICD10:R50.9",
      confidence: 0.88,
    },
    {
      text: "Mild dyspnea on exertion",
      matchStatus: "no_match",
      confidence: 0.62,
    },
  ],
  symptoms: [
    {
      text: "Cough",
      matchStatus: "matched",
      matchedCode: "SNOMED:49727002",
      confidence: 0.97,
    },
    {
      text: "Fatigue",
      matchStatus: "matched",
      matchedCode: "SNOMED:84229001",
      confidence: 0.9,
    },
    {
      text: "Intermittent chills",
      matchStatus: "matched",
      matchedCode: "SNOMED:43724002",
      confidence: 0.83,
    },
    {
      text: "Greenish sputum",
      matchStatus: "no_match",
      confidence: 0.55,
    },
  ],
  diagnoses: [
    {
      text: "Acute bronchitis",
      matchStatus: "matched",
      matchedCode: "ICD10:J20.9",
      confidence: 0.91,
    },
  ],
  medications: [
    {
      text: "Lisinopril 10 mg PO daily",
      matchStatus: "matched",
      matchedCode: "RxNorm:29046",
      confidence: 0.95,
    },
    {
      text: "Atorvastatin 20 mg PO nightly",
      matchStatus: "matched",
      matchedCode: "RxNorm:83367",
      confidence: 0.93,
    },
  ],
  investigations: [],
  procedures: [],
  follow_ups: [
    {
      text: "Return in 1 week if symptoms persist",
      matchStatus: "matched",
      matchedCode: "FU:WK1",
      confidence: 0.87,
    },
    {
      text: "Chest X-ray if not improving",
      matchStatus: "no_match",
      confidence: 0.58,
    },
  ],
};

export function mockExtraction(id: string): ExtractionResult {
  const now = new Date();
  const elapsedMs = 18_000 + Math.round(Math.random() * 22_000);
  const started = new Date(now.getTime() - elapsedMs);

  const results = {} as Record<ExtractionCategory, ExtractionItem[]>;
  for (const category of EXTRACTION_CATEGORIES) {
    const fixtures = EXTRACTION_FIXTURES[category];
    results[category] = fixtures.map((f, i) => ({
      ...f,
      id: `${category}-${i + 1}`,
    }));
  }

  return {
    modelId: id,
    startedAt: started.toISOString(),
    completedAt: now.toISOString(),
    results,
  };
}

export type RunInputType = "transcript" | "structured_note";

export interface RunSummary {
  id: string;
  modelId: string;
  inputType: RunInputType;
  startedAt: string;
  completedAt: string;
  durationS: number;
  matched: number;
  total: number;
}

export interface DashboardStats {
  modelsOnline: number;
  modelsTotal: number;
  extractionsToday: number;
  extractionsYesterday: number;
  avgProcessingS: number;
  matchRate: number;
}

const RUN_FIXTURES: Array<{
  modelId: string;
  inputType: RunInputType;
  offsetMin: number;
  durationS: number;
  matched: number;
  total: number;
}> = [
  { modelId: "qwen-2.5-7b", inputType: "transcript", offsetMin: 8, durationS: 28.43, matched: 10, total: 12 },
  { modelId: "medgemma-4b", inputType: "transcript", offsetMin: 22, durationS: 41.7, matched: 9, total: 12 },
  { modelId: "gemma-4-26b-a4b", inputType: "structured_note", offsetMin: 47, durationS: 33.1, matched: 11, total: 12 },
  { modelId: "gemma-4-e4b", inputType: "transcript", offsetMin: 64, durationS: 19.6, matched: 8, total: 12 },
  { modelId: "qwen-2.5-7b", inputType: "structured_note", offsetMin: 78, durationS: 30.8, matched: 11, total: 12 },
  { modelId: "medgemma-4b", inputType: "transcript", offsetMin: 96, durationS: 37.2, matched: 10, total: 12 },
  { modelId: "gemma-4-26b-a4b", inputType: "transcript", offsetMin: 124, durationS: 35.9, matched: 12, total: 12 },
  { modelId: "qwen-2.5-7b", inputType: "transcript", offsetMin: 158, durationS: 26.5, matched: 9, total: 12 },
  { modelId: "gemma-4-e4b", inputType: "structured_note", offsetMin: 182, durationS: 21.4, matched: 9, total: 12 },
  { modelId: "medgemma-27b", inputType: "transcript", offsetMin: 210, durationS: 44.8, matched: 8, total: 12 },
];

export function getMockRecentRuns(): RunSummary[] {
  const now = Date.now();
  return RUN_FIXTURES.map((f, idx) => {
    const completed = new Date(now - f.offsetMin * 60_000);
    const started = new Date(completed.getTime() - f.durationS * 1000);
    return {
      id: `run-${idx + 1}`,
      modelId: f.modelId,
      inputType: f.inputType,
      startedAt: started.toISOString(),
      completedAt: completed.toISOString(),
      durationS: f.durationS,
      matched: f.matched,
      total: f.total,
    };
  });
}

export function getMockDashboardStats(): DashboardStats {
  const runs = getMockRecentRuns();
  const avgProcessingS =
    runs.reduce((sum, r) => sum + r.durationS, 0) / Math.max(1, runs.length);
  const totalMatched = runs.reduce((s, r) => s + r.matched, 0);
  const totalItems = runs.reduce((s, r) => s + r.total, 0);
  const matchRate = totalItems === 0 ? 0 : totalMatched / totalItems;
  return {
    modelsOnline: BASE_MODELS.filter((m) => m.status === "online").length,
    modelsTotal: BASE_MODELS.length,
    extractionsToday: 23,
    extractionsYesterday: 19,
    avgProcessingS,
    matchRate,
  };
}
