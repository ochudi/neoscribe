"use client";

import { useState } from "react";
import { CircleAlert, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ExtractionOutput,
  type CategoryAnnotation,
  type ItemAnnotation,
} from "@/components/chat/ExtractionOutput";
import { RuntimeBadge, StatusDot, statusLabel } from "@/components/chat/shared";
import { formatMb } from "@/lib/local/device";
import { useLocalEngineStore } from "@/lib/local/engine";
import {
  flattenExtraction,
  processingSeconds,
  type ExtractionResult,
  type Model,
} from "@/lib/api/types";
import type { ExtractionCategory } from "@/lib/constants";

function ColumnHeader({
  model,
  extraction,
}: {
  model: Model;
  extraction: ExtractionResult | null;
}) {
  const items = extraction ? flattenExtraction(extraction) : [];
  const coded = items.filter((i) => i.matchStatus === "matched").length;
  const total = items.length;
  const pct = total === 0 ? 0 : Math.round((coded / total) * 100);

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
        <RuntimeBadge runtime={model.runtime} />
        <span className="font-mono text-[12px] text-muted-foreground">
          {model.provider}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <StatusDot status={model.status} />
          <span className="text-[12px] text-foreground">{statusLabel(model)}</span>
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
              {coded} / {total} findings coded
            </p>
          </div>
        </>
      ) : null}
    </header>
  );
}

function ColumnLoading({ model }: { model: Model }) {
  const runtime = useLocalEngineStore((s) => s.states[model.id]);
  const isDevice = model.runtime === "device";

  let label = "Running…";
  if (isDevice) {
    if (runtime?.status === "downloading") label = "Downloading model…";
    else if (runtime?.status === "loading") label = "Preparing on this device…";
    else if (runtime?.status === "generating")
      label = runtime.tps
        ? `Generating on this device (${runtime.tps.toFixed(1)} tok/s)…`
        : "Generating on this device…";
    else label = "Waiting for its turn — on-device models run one at a time…";
  }

  const progress = isDevice ? runtime?.progress : undefined;
  const pct =
    progress && progress.totalMb > 0
      ? Math.min(100, Math.round((progress.loadedMb / progress.totalMb) * 100))
      : null;

  return (
    <div className="flex flex-col gap-3 px-4 py-6">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-loading" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      {pct !== null && progress ? (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-foreground/70 transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            {formatMb(progress.loadedMb)} of {formatMb(progress.totalMb)}
          </p>
        </div>
      ) : (
        Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-3 overflow-hidden rounded bg-muted"
            style={{ width: `${100 - i * 8}%` }}
          >
            <div className="h-full w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
          </div>
        ))
      )}
    </div>
  );
}

function ColumnError({
  message,
  details,
  onRetry,
}: {
  message: string;
  details?: string | null;
  onRetry?: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <div className="px-4 py-6">
      <div className="flex flex-col gap-3 rounded-lg border border-status-offline/60 bg-status-offline/5 p-4">
        <div className="flex items-center gap-2 text-status-offline">
          <CircleAlert className="h-4 w-4 shrink-0" />
          <span className="text-[13px] font-medium">This run didn&apos;t finish</span>
        </div>
        <p className="text-[12px] leading-relaxed text-foreground">{message}</p>
        <div className="flex flex-wrap gap-2">
          {onRetry ? (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RotateCw className="h-3.5 w-3.5" />
              Try again
            </Button>
          ) : null}
          {details ? (
            <Button size="sm" variant="ghost" onClick={() => setShowDetails((v) => !v)}>
              {showDetails ? "Hide" : "Show"} details
            </Button>
          ) : null}
        </div>
        {showDetails && details ? (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-background p-2 font-mono text-[11px] text-muted-foreground">
            {details}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

function ColumnEmpty() {
  return (
    <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
      No results yet. Press{" "}
      <span className="font-medium text-foreground">Run on all models</span> above.
    </div>
  );
}

interface CompareColumnProps {
  model: Model;
  extraction: ExtractionResult | null;
  loading: boolean;
  error: string | null;
  errorDetails?: string | null;
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
  errorDetails,
  onRetry,
  highlightDiffs,
  categoryAnnotations,
  itemAnnotations,
}: CompareColumnProps) {
  return (
    <div className="compare-column flex min-w-0 snap-start flex-col rounded-lg border border-border bg-background print-break-inside-avoid">
      <ColumnHeader model={model} extraction={extraction} />

      <div className="p-3">
        {loading ? (
          <ColumnLoading model={model} />
        ) : error ? (
          <ColumnError message={error} details={errorDetails} onRetry={onRetry} />
        ) : extraction ? (
          <ExtractionOutput
            extraction={extraction}
            compact
            categoryAnnotations={highlightDiffs ? categoryAnnotations : undefined}
            itemAnnotations={highlightDiffs ? itemAnnotations : undefined}
          />
        ) : (
          <ColumnEmpty />
        )}
      </div>
    </div>
  );
}
