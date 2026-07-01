import { create } from "zustand";

import type { RunInputType } from "@/lib/api/types";
import type { ClinicalNote } from "@/lib/notes/types";

interface ScribeState {
  transcript: string;
  inputType: RunInputType;
  selectedModelId: string;
  note: ClinicalNote | null;
  isLoading: boolean;
  error: string | null;
  errorDetails: string | null;
  errorRetryable: boolean;
  /** Raw streaming output while an on-device model writes the note. */
  liveText: string;
  liveTps: number | null;

  setTranscript: (v: string) => void;
  setInputType: (t: RunInputType) => void;
  setSelectedModelId: (id: string) => void;
  setNote: (note: ClinicalNote | null) => void;
  setIsLoading: (v: boolean) => void;
  setError: (
    error: string | null,
    details?: string | null,
    retryable?: boolean
  ) => void;
  appendLiveText: (chunk: string, tps: number) => void;
  resetLive: () => void;
  clearTranscript: () => void;
}

export const useScribeStore = create<ScribeState>((set) => ({
  transcript: "",
  inputType: "transcript",
  selectedModelId: "",
  note: null,
  isLoading: false,
  error: null,
  errorDetails: null,
  errorRetryable: false,
  liveText: "",
  liveTps: null,

  setTranscript: (v) => set({ transcript: v }),
  setInputType: (t) => set({ inputType: t }),
  setSelectedModelId: (id) => set({ selectedModelId: id }),
  setNote: (note) => set({ note }),
  setIsLoading: (v) => set({ isLoading: v }),
  setError: (error, details = null, retryable = false) =>
    set({ error, errorDetails: details, errorRetryable: retryable }),
  appendLiveText: (chunk, tps) =>
    set((s) => ({ liveText: s.liveText + chunk, liveTps: tps })),
  resetLive: () => set({ liveText: "", liveTps: null }),
  clearTranscript: () => set({ transcript: "" }),
}));
