"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RuntimeBadge } from "@/components/chat/shared";
import type { RunSummary } from "@/lib/api/types";

function relativeFromNow(iso: string, nowMs: number) {
  const diff = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86_400)}d ago`;
}

function CodedMiniBar({ coded, total }: { coded: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((coded / total) * 100);
  return (
    <div className="flex w-full items-center gap-2">
      <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:w-20">
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

function EmptyRuns() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-background px-4 py-10 text-center">
      <p className="text-[14px] font-medium text-foreground">
        No extractions yet — run your first one.
      </p>
      <p className="max-w-sm text-[13px] text-muted-foreground">
        Open the workspace, load a sample transcript with one click, and watch a
        model structure it in seconds.
      </p>
      <Button asChild size="sm">
        <Link href="/chat">
          <Play className="h-3.5 w-3.5" />
          Try it now
        </Link>
      </Button>
    </div>
  );
}

interface RecentRunsProps {
  runs: RunSummary[];
}

export function RecentRuns({ runs }: RecentRunsProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="flex flex-col gap-3">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Recent runs
      </p>

      {runs.length === 0 ? (
        <EmptyRuns />
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="flex flex-col gap-2 md:hidden">
            {runs.slice(0, 5).map((run) => (
              <li key={run.id}>
                <Link
                  href={`/history?run=${encodeURIComponent(run.id)}`}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 transition-colors hover:border-foreground/25 hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[14px] font-medium text-foreground">
                      {run.modelName}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {relativeFromNow(run.savedAt, nowMs)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <CodedMiniBar coded={run.codedCount} total={run.itemCount} />
                    <span className="font-mono text-[12px] text-foreground">
                      {(run.durationMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-background md:block">
            <div className="grid grid-cols-[88px_minmax(0,1fr)_110px_80px_150px] items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="font-mono">When</span>
              <span>Model</span>
              <span>Where</span>
              <span className="font-mono">Time</span>
              <span>Items coded</span>
            </div>
            <ul className="divide-y divide-border">
              {runs.slice(0, 8).map((run) => (
                <li key={run.id}>
                  <Link
                    href={`/history?run=${encodeURIComponent(run.id)}`}
                    className="grid grid-cols-[88px_minmax(0,1fr)_110px_80px_150px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <span className="font-mono text-[12px] text-muted-foreground">
                      {relativeFromNow(run.savedAt, nowMs)}
                    </span>
                    <span className="truncate text-[14px] text-foreground">
                      {run.modelName}
                    </span>
                    <RuntimeBadge runtime={run.runtime} className="w-fit" />
                    <span className="font-mono text-[13px] text-foreground">
                      {(run.durationMs / 1000).toFixed(1)}s
                    </span>
                    <CodedMiniBar coded={run.codedCount} total={run.itemCount} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/history"
            className="group inline-flex items-center gap-1 self-start text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            View all in History
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </>
      )}
    </section>
  );
}
