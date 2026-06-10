import { create } from "zustand";

import type { ExtractionResult, RunInputType } from "@/lib/api/types";

export type ChatInputType = RunInputType;

export const LEFT_RAIL_KEY = "leftRail";
export const RIGHT_RAIL_KEY = "rightRail";

interface ChatState {
  selectedModelId: string;
  inputContent: string;
  inputType: ChatInputType;
  currentExtraction: ExtractionResult | null;
  isLoading: boolean;
  error: string | null;
  errorDetails: string | null;
  errorRetryable: boolean;
  /** Raw streaming output while an on-device model generates. */
  liveText: string;
  liveTps: number | null;
  expandedSections: Record<string, boolean>;

  setSelectedModelId: (id: string) => void;
  setInputContent: (content: string) => void;
  setInputType: (type: ChatInputType) => void;
  setExtraction: (extraction: ExtractionResult | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (
    error: string | null,
    details?: string | null,
    retryable?: boolean
  ) => void;
  appendLiveText: (chunk: string, tps: number) => void;
  resetLive: () => void;
  toggleSection: (key: string) => void;
  clearInput: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  selectedModelId: "",
  inputContent: "",
  inputType: "transcript",
  currentExtraction: null,
  isLoading: false,
  error: null,
  errorDetails: null,
  errorRetryable: false,
  liveText: "",
  liveTps: null,
  expandedSections: {
    [LEFT_RAIL_KEY]: true,
    [RIGHT_RAIL_KEY]: true,
  },

  setSelectedModelId: (id) => set({ selectedModelId: id }),
  setInputContent: (content) => set({ inputContent: content }),
  setInputType: (type) => set({ inputType: type }),
  setExtraction: (extraction) => set({ currentExtraction: extraction }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error, details = null, retryable = false) =>
    set({ error, errorDetails: details, errorRetryable: retryable }),
  appendLiveText: (chunk, tps) =>
    set((s) => ({ liveText: s.liveText + chunk, liveTps: tps })),
  resetLive: () => set({ liveText: "", liveTps: null }),

  toggleSection: (key) =>
    set((state) => ({
      expandedSections: {
        ...state.expandedSections,
        [key]: !state.expandedSections[key],
      },
    })),
  clearInput: () => set({ inputContent: "" }),
}));
