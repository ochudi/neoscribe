import type { ExtractionCategory } from "@/lib/constants";

/** Where a model executes. */
export type ModelRuntime = "cloud" | "device";

/**
 * online    — reachable / loaded and ready to run
 * loading   — downloading, warming up, or generating
 * available — on-device model that hasn't been downloaded yet
 * offline   — unreachable, or unsupported on this device
 */
export type ModelStatus = "online" | "loading" | "available" | "offline";

export interface Model {
  id: string;
  name: string;
  runtime: ModelRuntime;
  status: ModelStatus;
  /** Short human note shown when status needs explaining (e.g. "Not downloaded"). */
  statusDetail?: string;
  sizeLabel: string;
  provider: string;
  description: string;
  /** Cloud only: rough seconds per extraction, used for estimates. */
  typicalLatencyS?: number;
  /** Link to the model card on Hugging Face. */
  hfUrl?: string;
  /** Device only: download size for this device's backend, in MB. */
  downloadMb?: number;
  /** Device only: approximate memory needed while running, in GB. */
  minRamGb?: number;
  lastCheckedAt: string;
}

export type ExtractionMatchStatus = "matched" | "no_match";

export interface ExtractionItem {
  id: string;
  text: string;
  /** "matched" means the model suggested a clinical code for this finding. */
  matchStatus: ExtractionMatchStatus;
  matchedCode?: string;
}

export interface ExtractionResult {
  modelId: string;
  startedAt: string;
  completedAt: string;
  results: Record<ExtractionCategory, ExtractionItem[]>;
  /** Server id of the persisted run, when it was saved. */
  runId?: string;
}

export type RunInputType = "transcript" | "structured_note";

/** A persisted run, as returned by the API. */
export interface RunSummary {
  id: string;
  savedAt: string;
  modelId: string;
  modelName: string;
  modelSizeLabel: string;
  runtime: ModelRuntime;
  inputType: RunInputType;
  input: string;
  extraction: ExtractionResult;
  durationMs: number;
  itemCount: number;
  codedCount: number;
}

export interface DashboardStats {
  modelsOnline: number;
  modelsTotal: number;
  extractionsToday: number;
  extractionsYesterday: number;
  avgProcessingS: number;
  /** Share of extracted items that got a code suggestion today; null = no items. */
  codedRate: number | null;
}

export function flattenExtraction(extraction: ExtractionResult): ExtractionItem[] {
  return Object.values(extraction.results).flat();
}

export function processingSeconds(extraction: ExtractionResult): number {
  const ms =
    new Date(extraction.completedAt).getTime() -
    new Date(extraction.startedAt).getTime();
  return Math.max(0, ms) / 1000;
}
