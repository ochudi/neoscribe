"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Copy,
  Image as ImageIcon,
  Mic,
  Settings2,
  Type,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Model, ModelCapability, ModelStatus } from "@/lib/api/mocks";

const CAPABILITY_META: Record<
  ModelCapability,
  { icon: LucideIcon; label: string }
> = {
  text: { icon: Type, label: "Text" },
  audio: { icon: Mic, label: "Audio" },
  vision: { icon: ImageIcon, label: "Vision" },
  function_calling: { icon: Settings2, label: "Functions" },
};

const STATUS_META: Record<ModelStatus, { color: string; label: string }> = {
  online: { color: "bg-status-online", label: "Online" },
  loading: { color: "bg-status-loading", label: "Loading" },
  offline: { color: "bg-status-offline", label: "Offline" },
};

function formatMemory(sizeMb: number) {
  if (sizeMb >= 1024) {
    return `${(sizeMb / 1024).toFixed(1)} GB`;
  }
  return `${sizeMb} MB`;
}

function relativeSeconds(iso: string, nowMs: number) {
  const diff = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `Updated ${diff}s ago`;
  if (diff < 3600) return `Updated ${Math.floor(diff / 60)}m ago`;
  return `Updated ${Math.floor(diff / 3600)}h ago`;
}

function stripScheme(url: string) {
  return url.replace(/^https?:\/\//, "");
}

interface ModelCardProps {
  model: Model;
}

export function ModelCard({ model }: ModelCardProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const status = STATUS_META[model.status];
  const isCloud = model.location === "cloud";

  const handleCopyEndpoint = async () => {
    const value = model.endpoint ?? model.id;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Endpoint copied", { description: value });
    } catch {
      toast.error("Could not copy endpoint");
    }
  };

  return (
    <div className="flex flex-col rounded-md border border-border bg-background">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <h3 className="text-[16px] font-semibold leading-tight text-foreground">
          {model.name}
        </h3>
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-foreground">
          {model.sizeLabel}
        </span>
      </div>

      <div className="flex items-center gap-3 px-4 pt-2 pb-4">
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground">
          {model.location}
        </span>
        <span className="font-mono text-[12px] text-muted-foreground">
          {model.provider}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              status.color,
              model.status === "loading" && "animate-pulse"
            )}
          />
          <span className="text-[13px] text-foreground">{status.label}</span>
        </span>
      </div>

      <div className="border-t border-border" />

      <div className="flex flex-wrap gap-1.5 px-4 py-3">
        {model.capabilities.map((cap) => {
          const meta = CAPABILITY_META[cap];
          const Icon = meta.icon;
          return (
            <span
              key={cap}
              className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[12px] text-foreground"
            >
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pb-3 text-[12px] text-muted-foreground">
        <span className="min-w-0 truncate font-mono">
          {isCloud
            ? `Endpoint: ${model.endpoint ? stripScheme(model.endpoint) : "—"}`
            : `Memory: ${model.sizeMb ? formatMemory(model.sizeMb) : "—"}`}
        </span>
        <span className="shrink-0 font-mono">
          {relativeSeconds(model.lastCheckedAt, nowMs)}
        </span>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <Button asChild size="sm">
          <Link href={`/chat?model=${encodeURIComponent(model.id)}`}>
            Open in Chat
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/compare?model=${encodeURIComponent(model.id)}`}>
            Compare
          </Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={handleCopyEndpoint}
        >
          <Copy className="h-3.5 w-3.5" />
          Copy endpoint
        </Button>
      </div>
    </div>
  );
}
