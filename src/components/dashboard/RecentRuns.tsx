"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Model, RunSummary } from "@/lib/api/mocks";

function formatClock(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function relativeFromNow(iso: string, nowMs: number) {
  const diff = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function MatchMiniBar({ matched, total }: { matched: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((matched / total) * 100);
  return (
    <div className="flex w-full items-center gap-2">
      <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-muted">
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

interface RecentRunsProps {
  runs: RunSummary[];
  models: Model[];
}

export function RecentRuns({ runs, models }: RecentRunsProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const modelName = (id: string) =>
    models.find((m) => m.id === id)?.name ?? id;

  return (
    <section className="flex flex-col gap-3">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Recent runs
      </p>
      <div className="overflow-hidden rounded-md border border-border bg-background">
        <div
          className={cn(
            "grid items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground",
            "grid-cols-[64px_minmax(0,1fr)_120px_72px_140px_72px]"
          )}
        >
          <span className="font-mono">Time</span>
          <span>Model</span>
          <span>Type</span>
          <span className="font-mono">Duration</span>
          <span>Match rate</span>
          <span />
        </div>
        <ul className="divide-y divide-border">
          {runs.slice(0, 10).map((run) => (
            <li
              key={run.id}
              className="grid items-center gap-3 px-4 py-2.5 grid-cols-[64px_minmax(0,1fr)_120px_72px_140px_72px]"
            >
              <span className="font-mono text-[13px] text-foreground">
                {formatClock(run.startedAt)}
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] text-foreground">
                  {modelName(run.modelId)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {relativeFromNow(run.startedAt, nowMs)}
                </span>
              </div>
              <span className="text-[13px] text-foreground">
                {run.inputType === "transcript"
                  ? "Transcript"
                  : "Structured Note"}
              </span>
              <span className="font-mono text-[13px] text-foreground">
                {run.durationS.toFixed(1)}s
              </span>
              <MatchMiniBar matched={run.matched} total={run.total} />
              <div className="flex justify-end">
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/history?run=${encodeURIComponent(run.id)}`}>
                    Open
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <Link
        href="/history"
        className="inline-flex items-center gap-1 self-start text-[13px] text-muted-foreground hover:text-foreground"
      >
        View all in History
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
