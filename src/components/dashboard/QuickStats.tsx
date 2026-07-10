"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/lib/api/types";

interface StatCardProps {
  label: string;
  value: string;
  hint: string;
  trend?: "up" | "down" | "flat";
  /** Optional live dot rendered beside the hint (e.g. fleet health). */
  dot?: "online" | "loading";
  /** Entrance stagger position. */
  index: number;
}

function StatCard({ label, value, hint, trend, dot, index }: StatCardProps) {
  const TrendIcon =
    trend === "up"
      ? ArrowUp
      : trend === "down"
        ? ArrowDown
        : trend === "flat"
          ? Minus
          : null;
  return (
    <div
      className="flex flex-col gap-2.5 rounded-lg border border-border bg-background p-4 motion-safe:animate-fade-up sm:p-5"
      style={{ animationDelay: `${120 + index * 60}ms` }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
        {label}
      </p>
      <p className="font-mono text-[30px] font-semibold leading-none tracking-tight text-foreground sm:text-[34px]">
        {value}
      </p>
      <p className="mt-auto flex items-center gap-1.5 border-t border-border/60 pt-2.5 text-[12px] text-muted-foreground sm:text-[13px]">
        {dot ? (
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              dot === "online" ? "bg-status-online" : "bg-status-loading"
            )}
          />
        ) : null}
        {TrendIcon ? (
          <TrendIcon
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              trend === "up" && "text-status-online",
              trend === "down" && "text-status-offline"
            )}
          />
        ) : null}
        <span className="truncate">{hint}</span>
      </p>
    </div>
  );
}

export function QuickStats({ stats }: { stats: DashboardStats }) {
  const allHealthy = stats.modelsOnline === stats.modelsTotal;
  const dayDelta = stats.extractionsToday - stats.extractionsYesterday;
  const trend: "up" | "down" | "flat" =
    dayDelta > 0 ? "up" : dayDelta < 0 ? "down" : "flat";
  const trendText =
    dayDelta === 0
      ? "same as yesterday"
      : `${Math.abs(dayDelta)} ${dayDelta > 0 ? "more" : "fewer"} than yesterday`;

  const hasRunsToday = stats.extractionsToday > 0;

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        index={0}
        label="Cloud models"
        value={`${stats.modelsOnline}/${stats.modelsTotal}`}
        hint={allHealthy ? "all reachable right now" : "some are unavailable"}
        dot={allHealthy ? "online" : "loading"}
      />
      <StatCard
        index={1}
        label="Extractions today"
        value={String(stats.extractionsToday)}
        hint={trendText}
        trend={trend}
      />
      <StatCard
        index={2}
        label="Avg processing"
        value={hasRunsToday ? `${stats.avgProcessingS.toFixed(1)}s` : "—"}
        hint={hasRunsToday ? "per extraction today" : "no runs yet today"}
      />
      <StatCard
        index={3}
        label="Coding rate"
        value={
          stats.codedRate === null
            ? "—"
            : `${Math.round(stats.codedRate * 100)}%`
        }
        hint={
          stats.codedRate === null
            ? "no runs yet today"
            : "of findings got a code suggestion"
        }
      />
    </section>
  );
}
