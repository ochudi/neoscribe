"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { StatusDot } from "@/components/chat/shared";
import type { Model, RunSummary } from "@/lib/api/mocks";

function relativeShort(iso: string, nowMs: number) {
  const diff = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

interface ActiveModelsProps {
  models: Model[];
  runs: RunSummary[];
}

export function ActiveModels({ models, runs }: ActiveModelsProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const lastUsedByModel = useMemo(() => {
    const map = new Map<string, string>(); // modelId -> ISO of most recent startedAt
    for (const r of runs) {
      const existing = map.get(r.modelId);
      if (!existing || new Date(r.startedAt) > new Date(existing)) {
        map.set(r.modelId, r.startedAt);
      }
    }
    return map;
  }, [runs]);

  return (
    <section className="flex flex-col gap-3">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Active models
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {models.map((m) => {
          const lastUsed = lastUsedByModel.get(m.id);
          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-foreground">
                  {m.name}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {lastUsed
                    ? `Last used ${relativeShort(lastUsed, nowMs)}`
                    : "Not used yet"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                  {m.sizeLabel}
                </span>
                <StatusDot status={m.status} />
              </div>
            </div>
          );
        })}
      </div>
      <Link
        href="/models"
        className="inline-flex items-center gap-1 self-start text-[13px] text-muted-foreground hover:text-foreground"
      >
        Manage models
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
