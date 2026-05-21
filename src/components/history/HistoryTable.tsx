"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  matchStatsFor,
  processingSecondsFor,
  type HistoryEntry,
} from "@/lib/stores/historyStore";

export type SortColumn =
  | "savedAt"
  | "model"
  | "inputType"
  | "input"
  | "duration"
  | "matchRate";
export type SortDirection = "asc" | "desc";

export interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

function formatSavedAt(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function inputPreview(text: string) {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= 80) return collapsed;
  return `${collapsed.slice(0, 80)}…`;
}

function MatchMiniBar({ matched, total }: { matched: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((matched / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 bg-status-online"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-muted-foreground">
        {matched}/{total}
      </span>
    </div>
  );
}

const GRID_COLS =
  "grid-cols-[140px_minmax(180px,1fr)_120px_minmax(0,2fr)_90px_140px_180px]";

function SortHeader({
  label,
  column,
  state,
  onSort,
}: {
  label: string;
  column: SortColumn;
  state: SortState;
  onSort: (column: SortColumn) => void;
}) {
  const isActive = state.column === column;
  const Icon = !isActive
    ? ArrowUpDown
    : state.direction === "asc"
      ? ArrowUp
      : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        "flex items-center gap-1 text-left font-mono text-[11px] uppercase tracking-wider hover:text-foreground",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {label}
      <Icon className="h-3 w-3" />
    </button>
  );
}

interface HistoryTableProps {
  entries: HistoryEntry[];
  sort: SortState;
  onSortChange: (column: SortColumn) => void;
  onOpen: (entry: HistoryEntry) => void;
  onRerun: (entry: HistoryEntry) => void;
  onDelete: (entry: HistoryEntry) => void;
}

export function HistoryTable({
  entries,
  sort,
  onSortChange,
  onOpen,
  onRerun,
  onDelete,
}: HistoryTableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <div
        className={cn(
          "grid items-center gap-3 border-b border-border bg-muted/30 px-4 py-2",
          GRID_COLS
        )}
      >
        <SortHeader
          label="Saved at"
          column="savedAt"
          state={sort}
          onSort={onSortChange}
        />
        <SortHeader
          label="Model"
          column="model"
          state={sort}
          onSort={onSortChange}
        />
        <SortHeader
          label="Type"
          column="inputType"
          state={sort}
          onSort={onSortChange}
        />
        <SortHeader
          label="Input preview"
          column="input"
          state={sort}
          onSort={onSortChange}
        />
        <SortHeader
          label="Duration"
          column="duration"
          state={sort}
          onSort={onSortChange}
        />
        <SortHeader
          label="Match"
          column="matchRate"
          state={sort}
          onSort={onSortChange}
        />
        <span className="text-right font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Actions
        </span>
      </div>

      <ul className="divide-y divide-border">
        {entries.map((entry) => {
          const { matched, total } = matchStatsFor(entry);
          const dur = processingSecondsFor(entry);
          return (
            <li
              key={entry.id}
              className={cn(
                "grid cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30",
                GRID_COLS
              )}
              onClick={() => onOpen(entry)}
            >
              <span className="font-mono text-[12px] text-foreground">
                {formatSavedAt(entry.savedAt)}
              </span>
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[14px] text-foreground">
                  {entry.modelName}
                </span>
                {entry.modelSizeLabel ? (
                  <span className="shrink-0 rounded border border-border px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {entry.modelSizeLabel}
                  </span>
                ) : null}
              </div>
              <span className="text-[13px] text-foreground">
                {entry.inputType === "transcript"
                  ? "Transcript"
                  : "Structured Note"}
              </span>
              <span className="truncate font-mono text-[12px] text-muted-foreground">
                {inputPreview(entry.input) || (
                  <span className="italic">(empty input)</span>
                )}
              </span>
              <span className="font-mono text-[13px] text-foreground">
                {dur.toFixed(1)}s
              </span>
              <MatchMiniBar matched={matched} total={total} />
              <div
                className="flex items-center justify-end gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2"
                  onClick={() => onOpen(entry)}
                >
                  View
                </Button>
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2"
                  onClick={() => onRerun(entry)}
                >
                  Re-run
                </Button>
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2 text-status-offline hover:text-status-offline"
                  onClick={() => onDelete(entry)}
                >
                  Delete
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
