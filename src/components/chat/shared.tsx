"use client";

import { Cloud, MonitorSmartphone, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Model, ModelRuntime, ModelStatus } from "@/lib/api/types";

export const STATUS_META: Record<
  ModelStatus,
  { color: string; label: string }
> = {
  online: { color: "bg-status-online", label: "Ready" },
  loading: { color: "bg-status-loading", label: "Working" },
  available: { color: "bg-muted-foreground/50", label: "Not downloaded" },
  offline: { color: "bg-status-offline", label: "Unavailable" },
};

export const RUNTIME_META: Record<
  ModelRuntime,
  { icon: LucideIcon; label: string; blurb: string }
> = {
  cloud: {
    icon: Cloud,
    label: "Cloud",
    blurb: "Runs on hosted GPUs via Hugging Face",
  },
  device: {
    icon: MonitorSmartphone,
    label: "On-device",
    blurb: "Runs in your browser — input never leaves this device",
  },
};

export function StatusDot({
  status,
  className,
}: {
  status: ModelStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
        meta.color,
        status === "loading" && "animate-pulse",
        className
      )}
      aria-label={meta.label}
    />
  );
}

export function RuntimeBadge({
  runtime,
  className,
}: {
  runtime: ModelRuntime;
  className?: string;
}) {
  const meta = RUNTIME_META[runtime];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
        className
      )}
      title={meta.blurb}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

/** Status line for a model, including on-device detail like "Downloading…". */
export function statusLabel(model: Model): string {
  if (model.statusDetail) return model.statusDetail;
  return STATUS_META[model.status].label;
}

export function relativeShort(iso: string, nowMs: number) {
  const diff = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86_400)}d ago`;
}
