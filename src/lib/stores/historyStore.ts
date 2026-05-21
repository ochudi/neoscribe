import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ExtractionResult, RunInputType } from "@/lib/api/mocks";

export interface HistoryEntry {
  id: string;
  savedAt: string;
  modelId: string;
  modelName: string;
  modelSizeLabel: string;
  inputType: RunInputType;
  input: string;
  extraction: ExtractionResult;
}

interface HistoryState {
  entries: HistoryEntry[];
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addEntry: (
    partial: Omit<HistoryEntry, "id" | "savedAt">
  ) => HistoryEntry;
  removeEntry: (id: string) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      addEntry: (partial) => {
        const id = `hist-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;
        const savedAt = new Date().toISOString();
        const entry: HistoryEntry = { ...partial, id, savedAt };
        set((state) => ({ entries: [entry, ...state.entries] }));
        return entry;
      },
      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: "neoscribe-history-v1",
      partialize: (state) => ({ entries: state.entries }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function flattenItems(entry: HistoryEntry) {
  return Object.values(entry.extraction.results).flat();
}

export function matchStatsFor(entry: HistoryEntry) {
  const items = flattenItems(entry);
  const matched = items.filter((i) => i.matchStatus === "matched").length;
  return { matched, total: items.length };
}

export function processingSecondsFor(entry: HistoryEntry) {
  const ms =
    new Date(entry.extraction.completedAt).getTime() -
    new Date(entry.extraction.startedAt).getTime();
  return Math.max(0, ms) / 1000;
}
