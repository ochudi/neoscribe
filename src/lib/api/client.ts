import { API_BASE_URL } from "@/lib/constants";
import { getClientId } from "@/lib/clientId";
import type {
  DashboardStats,
  ExtractionResult,
  Model,
  RunSummary,
} from "@/lib/api/types";

export interface ExtractionPayload {
  transcript: string;
  inputType?: string;
}

/**
 * API error with the server's human-readable explanation. `details` carries
 * the raw provider output for the curious; `retryable` drives the Retry UI.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function friendlyNetworkError(): ApiError {
  return new ApiError(
    0,
    "We couldn't reach the NeoScribe server. Check your internet connection and try again.",
    undefined,
    true
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-client-id": getClientId(),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw friendlyNetworkError();
  }

  if (!res.ok) {
    let message = `The server returned an unexpected error (HTTP ${res.status}).`;
    let details: string | undefined;
    let retryable = res.status >= 500;
    try {
      const body = await res.json();
      if (typeof body?.error === "string" && body.error) message = body.error;
      if (typeof body?.details === "string") details = body.details;
      if (typeof body?.retryable === "boolean") retryable = body.retryable;
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    throw new ApiError(res.status, message, details, retryable);
  }

  return (await res.json()) as T;
}

/** Cloud models only — on-device models are merged in by useModels(). */
export async function listCloudModels(): Promise<Model[]> {
  return request<Model[]>("/v1/models");
}

export async function extractWithCloudModel(
  id: string,
  payload: ExtractionPayload
): Promise<ExtractionResult> {
  return request<ExtractionResult>(
    `/v1/models/${encodeURIComponent(id)}/extract`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

/** Raw clinical-note output from a cloud model; the client parses `content`. */
export interface CloudNoteResponse {
  content: string;
  startedAt: string;
  completedAt: string;
}

export async function generateCloudNote(
  id: string,
  payload: ExtractionPayload
): Promise<CloudNoteResponse> {
  return request<CloudNoteResponse>(
    `/v1/models/${encodeURIComponent(id)}/note`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export async function listRuns(limit = 200): Promise<RunSummary[]> {
  return request<RunSummary[]>(`/v1/runs?limit=${limit}`);
}

export interface RecordRunPayload {
  modelId: string;
  modelName: string;
  modelSizeLabel: string;
  runtime: "cloud" | "device";
  inputType: string;
  input: string;
  extraction: ExtractionResult;
  durationMs: number;
}

export async function recordRun(payload: RecordRunPayload): Promise<RunSummary> {
  return request<RunSummary>("/v1/runs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteRun(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/v1/runs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function clearRuns(): Promise<void> {
  await request<{ ok: boolean }>("/v1/runs", { method: "DELETE" });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const params = new URLSearchParams({
    today: today.toISOString(),
    yesterday: yesterday.toISOString(),
  });
  return request<DashboardStats>(`/v1/dashboard/stats?${params.toString()}`);
}
