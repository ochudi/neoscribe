import { API_BASE_URL, USE_MOCKS } from "@/lib/constants";
import {
  getMockModels,
  mockExtraction,
  mockModelHealth,
  type ExtractionResult,
  type Model,
  type ModelHealth,
} from "@/lib/api/mocks";

export interface ExtractionPayload {
  transcript: string;
  categories?: string[];
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, `Request failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

export async function listModels(): Promise<Model[]> {
  if (USE_MOCKS) return getMockModels();
  return request<Model[]>("/v1/models");
}

export async function getModelHealth(id: string): Promise<ModelHealth> {
  if (USE_MOCKS) return mockModelHealth(id);
  return request<ModelHealth>(`/v1/models/${encodeURIComponent(id)}/health`);
}

export async function extractWithModel(
  id: string,
  payload: ExtractionPayload
): Promise<ExtractionResult> {
  if (USE_MOCKS) {
    const delay = 1500 + Math.random() * 1500;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return mockExtraction(id);
  }
  return request<ExtractionResult>(
    `/v1/models/${encodeURIComponent(id)}/extract`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export { ApiError };
