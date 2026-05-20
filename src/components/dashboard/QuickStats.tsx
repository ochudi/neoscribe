"use client";

import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/lib/api/mocks";

interface StatCardProps {
  label: string;
  value: string;
  hint: string;
  trend?: "up" | "down" | "flat";
  trendIcon?: LucideIcon;
}

function StatCard({ label, value, hint, trend }: StatCardProps) {
  const TrendIcon =
    trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : trend === "flat" ? Minus : null;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-4">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-[32px] font-semibold leading-none tracking-tight text-foreground">
        {value}
      </p>
      <p
        className={cn(
          "flex items-center gap-1 text-[13px] text-muted-foreground"
        )}
      >
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
      : `${dayDelta > 0 ? "↑" : "↓"} ${Math.abs(dayDelta)} from yesterday`;

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Models online"
        value={`${stats.modelsOnline}/${stats.modelsTotal}`}
        hint={allHealthy ? "All systems healthy" : "Some models degraded"}
      />
      <StatCard
        label="Extractions today"
        value={String(stats.extractionsToday)}
        hint={trendText}
        trend={trend}
      />
      <StatCard
        label="Avg processing time"
        value={`${stats.avgProcessingS.toFixed(1)}s`}
        hint="across all models"
      />
      <StatCard
        label="Match rate"
        value={`${Math.round(stats.matchRate * 100)}%`}
        hint="across today's runs"
      />
    </section>
  );
}
