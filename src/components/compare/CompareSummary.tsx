"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import {
  flattenExtraction,
  processingSeconds,
  type ExtractionResult,
  type Model,
} from "@/lib/api/types";

interface CompareSummaryProps {
  models: Model[];
  results: Record<string, ExtractionResult | null>;
}

function BarRow({
  label,
  value,
  display,
  max,
}: {
  label: string;
  value: number;
  display: string;
  max: number;
}) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-[12px] text-foreground">
        {label}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 bg-foreground/80 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-24 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
        {display}
      </span>
    </div>
  );
}

function MetricBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

interface ModelMetric {
  id: string;
  name: string;
  coded: number;
  total: number;
  codedRate: number;
  processingS: number | null;
  totalItems: number;
}

function pickBest<T>(
  arr: T[],
  key: (t: T) => number | null,
  mode: "max" | "min"
): T | null {
  const ranked = arr
    .map((t) => ({ t, v: key(t) }))
    .filter((x): x is { t: T; v: number } => x.v !== null);
  if (ranked.length === 0) return null;
  ranked.sort((a, b) => (mode === "max" ? b.v - a.v : a.v - b.v));
  return ranked[0].t;
}

export function CompareSummary({ models, results }: CompareSummaryProps) {
  const metrics = useMemo<ModelMetric[]>(() => {
    return models.map((m) => {
      const extraction = results[m.id];
      if (!extraction) {
        return {
          id: m.id,
          name: m.name,
          coded: 0,
          total: 0,
          codedRate: 0,
          processingS: null,
          totalItems: 0,
        };
      }
      const flat = flattenExtraction(extraction);
      const coded = flat.filter((i) => i.matchStatus === "matched").length;
      const total = flat.length;
      return {
        id: m.id,
        name: m.name,
        coded,
        total,
        codedRate: total === 0 ? 0 : coded / total,
        processingS: processingSeconds(extraction),
        totalItems: total,
      };
    });
  }, [models, results]);

  const allReady = metrics.every((m) => m.processingS !== null);

  const maxRate = Math.max(0.0001, ...metrics.map((m) => m.codedRate));
  const maxTime = Math.max(0.0001, ...metrics.map((m) => m.processingS ?? 0));
  const maxItems = Math.max(1, ...metrics.map((m) => m.totalItems));

  const fastest = allReady ? pickBest(metrics, (m) => m.processingS, "min") : null;
  const broadest = allReady ? pickBest(metrics, (m) => m.totalItems, "max") : null;
  const bestCoder = allReady ? pickBest(metrics, (m) => m.codedRate, "max") : null;

  if (metrics.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
          Summary
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {allReady
            ? `${metrics.length} models compared`
            : "waiting for results"}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-6 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricBlock title="Coding rate">
          {metrics.map((m) => (
            <BarRow
              key={m.id}
              label={m.name}
              value={m.codedRate}
              display={
                m.processingS === null
                  ? "—"
                  : `${m.coded}/${m.total} (${Math.round(m.codedRate * 100)}%)`
              }
              max={maxRate}
            />
          ))}
        </MetricBlock>

        <MetricBlock title="Processing time">
          {metrics.map((m) => (
            <BarRow
              key={m.id}
              label={m.name}
              value={m.processingS ?? 0}
              display={m.processingS === null ? "—" : `${m.processingS.toFixed(2)}s`}
              max={maxTime}
            />
          ))}
        </MetricBlock>

        <MetricBlock title="Findings extracted">
          {metrics.map((m) => (
            <BarRow
              key={m.id}
              label={m.name}
              value={m.totalItems}
              display={m.processingS === null ? "—" : String(m.totalItems)}
              max={maxItems}
            />
          ))}
        </MetricBlock>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-border px-4 py-3.5 text-[12px]",
          !allReady && "text-muted-foreground"
        )}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Leaders
        </span>
        {allReady && fastest && broadest && bestCoder ? (
          <>
            <span>
              Fastest:{" "}
              <span className="font-medium text-foreground">{fastest.name}</span>
            </span>
            <span>
              Most findings:{" "}
              <span className="font-medium text-foreground">{broadest.name}</span>
            </span>
            <span>
              Best coding:{" "}
              <span className="font-medium text-foreground">{bestCoder.name}</span>
            </span>
          </>
        ) : (
          <span>Run the comparison to see which model leads each metric.</span>
        )}
      </div>
    </div>
  );
}
