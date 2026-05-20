import { create } from "zustand";

import type { ExtractionResult } from "@/lib/api/mocks";

export type ChatInputType = "transcript" | "structured_note";

export const LEFT_RAIL_KEY = "leftRail";
export const RIGHT_RAIL_KEY = "rightRail";

interface ChatState {
  selectedModelId: string;
  inputContent: string;
  inputType: ChatInputType;
  currentExtraction: ExtractionResult | null;
  isLoading: boolean;
  error: string | null;
  expandedSections: Record<string, boolean>;

  setSelectedModelId: (id: string) => void;
  setInputContent: (content: string) => void;
  setInputType: (type: ChatInputType) => void;
  setExtraction: (extraction: ExtractionResult | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  toggleSection: (key: string) => void;
  setSectionExpanded: (key: string, expanded: boolean) => void;
  clearInput: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  selectedModelId: "",
  inputContent: "",
  inputType: "transcript",
  currentExtraction: null,
  isLoading: false,
  error: null,
  expandedSections: {
    [LEFT_RAIL_KEY]: true,
    [RIGHT_RAIL_KEY]: true,
  },

  setSelectedModelId: (id) => set({ selectedModelId: id }),
  setInputContent: (content) => set({ inputContent: content }),
  setInputType: (type) => set({ inputType: type }),
  setExtraction: (extraction) => set({ currentExtraction: extraction }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  toggleSection: (key) =>
    set((state) => ({
      expandedSections: {
        ...state.expandedSections,
        [key]: !state.expandedSections[key],
      },
    })),
  setSectionExpanded: (key, expanded) =>
    set((state) => ({
      expandedSections: { ...state.expandedSections, [key]: expanded },
    })),
  clearInput: () => set({ inputContent: "" }),
}));
