"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/lib/api/types";

interface StatCardProps {
  label: string;
  value: string;
  hint: string;
  trend?: "up" | "down" | "flat";
}

function StatCard({ label, value, hint, trend }: StatCardProps) {
  const TrendIcon =
    trend === "up"
      ? ArrowUp
      : trend === "down"
        ? ArrowDown
        : trend === "flat"
          ? Minus
          : null;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-[30px] font-semibold leading-none tracking-tight text-foreground">
        {value}
      </p>
      <p className="flex items-center gap-1 text-[12px] text-muted-foreground sm:text-[13px]">
        {TrendIcon ? (
          <TrendIcon
            className={cn(
              "h-3.5 w-3.5",
              trend === "up" && "text-status-online",
              trend === "down" && "text-status-offline"
            )}
          />
        ) : null}
        {hint}
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
        label="Cloud models"
        value={`${stats.modelsOnline}/${stats.modelsTotal}`}
        hint={allHealthy ? "all reachable right now" : "some are unavailable"}
      />
      <StatCard
        label="Extractions today"
        value={String(stats.extractionsToday)}
        hint={trendText}
        trend={trend}
      />
      <StatCard
        label="Avg processing"
        value={hasRunsToday ? `${stats.avgProcessingS.toFixed(1)}s` : "—"}
        hint={hasRunsToday ? "per extraction today" : "no runs yet today"}
      />
      <StatCard
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
