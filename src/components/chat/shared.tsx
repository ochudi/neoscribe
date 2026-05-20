"use client";

import {
  Image as ImageIcon,
  Mic,
  Settings2,
  Type,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { ModelCapability, ModelStatus } from "@/lib/api/mocks";

export const STATUS_META: Record<
  ModelStatus,
  { color: string; label: string }
> = {
  online: { color: "bg-status-online", label: "Online" },
  loading: { color: "bg-status-loading", label: "Loading" },
  offline: { color: "bg-status-offline", label: "Offline" },
};

export const CAPABILITY_META: Record<
  ModelCapability,
  { icon: LucideIcon; label: string }
> = {
  text: { icon: Type, label: "Text" },
  audio: { icon: Mic, label: "Audio" },
  vision: { icon: ImageIcon, label: "Vision" },
  function_calling: { icon: Settings2, label: "Functions" },
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
        "inline-block h-1.5 w-1.5 rounded-full",
        meta.color,
        status === "loading" && "animate-pulse",
        className
      )}
      aria-label={meta.label}
    />
  );
}

export function formatMemory(sizeMb: number) {
  if (sizeMb >= 1024) return `${(sizeMb / 1024).toFixed(1)} GB`;
  return `${sizeMb} MB`;
}

export function relativeShort(iso: string, nowMs: number) {
  const diff = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
