"use client";

import { CircleAlert, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ExtractionOutput,
  type CategoryAnnotation,
  type ItemAnnotation,
} from "@/components/chat/ExtractionOutput";
import { StatusDot } from "@/components/chat/shared";
import { cn } from "@/lib/utils";
import type {
  ExtractionItem,
  ExtractionResult,
  Model,
} from "@/lib/api/mocks";
import {
  EXTRACTION_CATEGORIES,
  type ExtractionCategory,
} from "@/lib/constants";

function processingSeconds(extraction: ExtractionResult) {
  const ms =
    new Date(extraction.completedAt).getTime() -
    new Date(extraction.startedAt).getTime();
  return Math.max(0, ms) / 1000;
}

function flatten(extraction: ExtractionResult): ExtractionItem[] {
  return EXTRACTION_CATEGORIES.flatMap((c) => extraction.results[c] ?? []);
}

function ColumnHeader({
  model,
  extraction,
}: {
  model: Model;
  extraction: ExtractionResult | null;
}) {
  const items = extraction ? flatten(extraction) : [];
  const matched = items.filter((i) => i.matchStatus === "matched").length;
  const total = items.length;
  const pct = total === 0 ? 0 : Math.round((matched / total) * 100);

  return (
    <header className="sticky top-0 z-10 flex flex-col gap-2 border-b border-border bg-background px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[16px] font-semibold leading-tight text-foreground">
          {model.name}
        </p>
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-foreground">
          {model.sizeLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground">
          {model.location}
        </span>
        <span className="font-mono text-[12px] text-muted-foreground">
          {model.provider}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <StatusDot status={model.status} />
          <span className="text-[12px] text-foreground">
            {model.status === "online"
              ? "Online"
              : model.status === "loading"
                ? "Loading"
                : "Offline"}
          </span>
        </span>
      </div>

      {extraction ? (
        <>
          <p className="font-mono text-[22px] font-medium leading-tight text-foreground">
            {processingSeconds(extraction).toFixed(2)}s
          </p>
          <div className="flex flex-col gap-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-status-online transition-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {matched} / {total} matched
            </p>
          </div>
        </>
      ) : null}
    </header>
  );
}

function ColumnLoading() {
  return (
    <div className="flex flex-col gap-3 px-4 py-6">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-loading" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Running…
        </span>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-3 w-full overflow-hidden rounded bg-muted"
          style={{ width: `${100 - i * 8}%` }}
        >
          <div className="h-full w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
        </div>
      ))}
    </div>
  );
}

function ColumnError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="px-4 py-6">
      <div className="flex flex-col gap-3 rounded-md border border-status-offline/60 bg-status-offline/5 p-4">
        <div className="flex items-center gap-2 text-status-offline">
          <CircleAlert className="h-4 w-4" />
          <span className="text-[13px] font-medium">Extraction failed</span>
        </div>
        <p className="font-mono text-[12px] text-foreground">{message}</p>
        {onRetry ? (
          <div>
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RotateCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ColumnEmpty() {
  return (
    <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
      No results yet. Click <span className="font-medium">Run on all models</span>{" "}
      above to populate this column.
    </div>
  );
}

interface CompareColumnProps {
  model: Model;
  extraction: ExtractionResult | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  highlightDiffs: boolean;
  categoryAnnotations?: Partial<Record<ExtractionCategory, CategoryAnnotation>>;
  itemAnnotations?: Record<string, ItemAnnotation>;
}

export function CompareColumn({
  model,
  extraction,
  loading,
  error,
  onRetry,
  highlightDiffs,
  categoryAnnotations,
  itemAnnotations,
}: CompareColumnProps) {
  return (
    <div
      className={cn(
        "compare-column flex flex-col rounded-md border border-border bg-background print-break-inside-avoid"
      )}
    >
      <ColumnHeader model={model} extraction={extraction} />

      <div className="p-3">
        {loading ? (
          <ColumnLoading />
        ) : error ? (
          <ColumnError message={error} onRetry={onRetry} />
        ) : extraction ? (
          <ExtractionOutput
            extraction={extraction}
            compact
            categoryAnnotations={
              highlightDiffs ? categoryAnnotations : undefined
            }
            itemAnnotations={highlightDiffs ? itemAnnotations : undefined}
          />
        ) : (
          <ColumnEmpty />
        )}
      </div>
    </div>
  );
}
