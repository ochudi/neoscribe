"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RuntimeBadge } from "@/components/chat/shared";
import { cn } from "@/lib/utils";
import type { RunSummary } from "@/lib/api/types";

export type SortColumn =
  | "savedAt"
  | "model"
  | "input"
  | "duration"
  | "codedRate";
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

function CodedMiniBar({ coded, total }: { coded: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((coded / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 bg-status-online"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-muted-foreground">
        {coded}/{total}
      </span>
    </div>
  );
}

const GRID_COLS =
  "grid-cols-[130px_minmax(170px,1fr)_100px_minmax(0,2fr)_80px_120px_170px]";

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
  entries: RunSummary[];
  sort: SortState;
  onSortChange: (column: SortColumn) => void;
  onOpen: (entry: RunSummary) => void;
  onRerun: (entry: RunSummary) => void;
  onDelete: (entry: RunSummary) => void;
}

function MobileCardList({
  entries,
  onOpen,
  onRerun,
  onDelete,
}: Omit<HistoryTableProps, "sort" | "onSortChange">) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="rounded-md border border-border bg-background p-4 transition-colors hover:bg-muted/30"
        >
          <button
            type="button"
            onClick={() => onOpen(entry)}
            className="flex w-full flex-col gap-3 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="truncate text-[14px] font-medium text-foreground">
                  {entry.modelName}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {formatSavedAt(entry.savedAt)}
                </p>
              </div>
              <RuntimeBadge runtime={entry.runtime} className="shrink-0" />
            </div>

            <p className="line-clamp-2 font-mono text-[12px] text-muted-foreground">
              {inputPreview(entry.input) || "(empty input)"}
            </p>

            <div className="flex items-center justify-between gap-3">
              <CodedMiniBar coded={entry.codedCount} total={entry.itemCount} />
              <span className="font-mono text-[12px] text-foreground">
                {(entry.durationMs / 1000).toFixed(1)}s
              </span>
            </div>
          </button>

          <div className="mt-3 flex items-center gap-1 border-t border-border pt-3">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 px-2"
              onClick={() => onOpen(entry)}
            >
              View
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 px-2"
              onClick={() => onRerun(entry)}
            >
              Re-run
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 px-2 text-status-offline hover:text-status-offline"
              onClick={() => onDelete(entry)}
            >
              Delete
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
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
    <>
      <MobileCardList
        entries={entries}
        onOpen={onOpen}
        onRerun={onRerun}
        onDelete={onDelete}
      />

      <div className="hidden overflow-hidden rounded-md border border-border bg-background md:block">
        <div
          className={cn(
            "grid items-center gap-3 border-b border-border bg-muted/30 px-4 py-2",
            GRID_COLS
          )}
        >
          <SortHeader label="Saved" column="savedAt" state={sort} onSort={onSortChange} />
          <SortHeader label="Model" column="model" state={sort} onSort={onSortChange} />
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Where
          </span>
          <SortHeader label="Input" column="input" state={sort} onSort={onSortChange} />
          <SortHeader label="Time" column="duration" state={sort} onSort={onSortChange} />
          <SortHeader label="Coded" column="codedRate" state={sort} onSort={onSortChange} />
          <span className="text-right font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Actions
          </span>
        </div>

        <ul className="divide-y divide-border">
          {entries.map((entry) => (
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
              <RuntimeBadge runtime={entry.runtime} className="w-fit" />
              <span className="truncate font-mono text-[12px] text-muted-foreground">
                {inputPreview(entry.input) || <span className="italic">(empty)</span>}
              </span>
              <span className="font-mono text-[13px] text-foreground">
                {(entry.durationMs / 1000).toFixed(1)}s
              </span>
              <CodedMiniBar coded={entry.codedCount} total={entry.itemCount} />
              <div
                className="flex items-center justify-end gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button size="sm" variant="ghost" className="px-2" onClick={() => onOpen(entry)}>
                  View
                </Button>
                <Button size="sm" variant="ghost" className="px-2" onClick={() => onRerun(entry)}>
                  Re-run
                </Button>
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
          ))}
        </ul>
      </div>
    </>
  );
}
