"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  RuntimeBadge,
  StatusDot,
  statusLabel,
} from "@/components/chat/shared";
import { LocalModelGate } from "@/components/models/LocalModelGate";
import { cn } from "@/lib/utils";
import { useModels } from "@/lib/hooks/useModels";
import { formatMb } from "@/lib/local/device";
import {
  ensureLoaded,
  removeDownload,
  useLocalEngineStore,
} from "@/lib/local/engine";
import { useChatStore, LEFT_RAIL_KEY } from "@/lib/stores/chatStore";
import type { Model } from "@/lib/api/types";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </p>
  );
}

export function GroupedPicker({
  models,
  selectedId,
  onSelect,
}: {
  models: Model[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const selected = models.find((m) => m.id === selectedId);

  const grouped = useMemo(
    () => ({
      cloud: models.filter((m) => m.runtime === "cloud"),
      device: models.filter((m) => m.runtime === "device"),
    }),
    [models]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-[13px] transition-colors",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected ? (
            <StatusDot status={selected.status} />
          ) : (
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="truncate text-foreground">
            {selected ? selected.name : "Select a model"}
          </span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-96 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
      >
        {(
          [
            ["cloud", "Cloud — hosted GPUs"],
            ["device", "On-device — runs in your browser"],
          ] as const
        ).map(([group, label], gi) => {
          const items = grouped[group];
          if (items.length === 0) return null;
          return (
            <DropdownMenuGroup key={group}>
              {gi > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {label}
              </DropdownMenuLabel>
              {items.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onSelect={() => onSelect(m.id)}
                  className="flex items-center gap-2"
                >
                  <StatusDot status={m.status} />
                  <span className="flex-1 truncate text-[13px]">{m.name}</span>
                  <span className="rounded border border-border px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {m.sizeLabel}
                  </span>
                  {m.id === selectedId ? (
                    <Check className="h-3.5 w-3.5 text-foreground" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DownloadProgress({ modelId }: { modelId: string }) {
  const runtime = useLocalEngineStore((s) => s.states[modelId]);
  if (!runtime?.progress) return null;
  const { loadedMb, totalMb } = runtime.progress;
  const pct = totalMb > 0 ? Math.min(100, Math.round((loadedMb / totalMb) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-foreground/70 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        {formatMb(loadedMb)} of {formatMb(totalMb)} ({pct}%)
      </p>
    </div>
  );
}

export function ModelDetail({ model }: { model: Model }) {
  const [gateOpen, setGateOpen] = useState(false);
  const runtime = useLocalEngineStore((s) => s.states[model.id]);
  const downloaded = useLocalEngineStore((s) => !!s.downloaded[model.id]);

  const isDevice = model.runtime === "device";
  const busy =
    runtime?.status === "downloading" ||
    runtime?.status === "loading" ||
    runtime?.status === "generating";

  const startDownload = async (modelId: string) => {
    try {
      await ensureLoaded(modelId);
      toast.success(`${model.name} is ready`, {
        description: "Loaded into memory on this device.",
      });
    } catch (e) {
      toast.error("Couldn't prepare the model", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const handleRemove = async () => {
    await removeDownload(model.id);
    toast.success(`${model.name} removed`, {
      description: "Its files were deleted from the browser cache.",
    });
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[14px] font-semibold leading-tight text-foreground">
          {model.name}
        </p>
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-foreground">
          {model.sizeLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <RuntimeBadge runtime={model.runtime} />
        <span className="font-mono text-[12px] text-muted-foreground">
          {model.provider}
        </span>
      </div>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        {model.description}
      </p>

      {isDevice && model.downloadMb ? (
        <p className="font-mono text-[11px] text-muted-foreground">
          {formatMb(model.downloadMb)} download · needs ~{model.minRamGb} GB RAM
        </p>
      ) : null}
      {!isDevice && model.typicalLatencyS ? (
        <p className="font-mono text-[11px] text-muted-foreground">
          Typically ~{model.typicalLatencyS}s per extraction
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="flex items-center gap-1.5">
          <StatusDot status={model.status} />
          <span className="text-foreground">{statusLabel(model)}</span>
        </span>
        {runtime?.tps ? (
          <span className="font-mono text-muted-foreground">
            {runtime.tps.toFixed(1)} tok/s
          </span>
        ) : null}
      </div>

      {isDevice && runtime?.status === "downloading" ? (
        <DownloadProgress modelId={model.id} />
      ) : null}

      {isDevice && model.status !== "offline" ? (
        <div className="flex flex-col gap-1.5">
          {!downloaded && !busy ? (
            <Button size="sm" variant="outline" onClick={() => setGateOpen(true)}>
              <Download className="h-3.5 w-3.5" />
              Download to this device
            </Button>
          ) : null}
          {downloaded && !busy ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              className="justify-start text-muted-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove download
            </Button>
          ) : null}
        </div>
      ) : null}

      {isDevice && model.status === "offline" && model.statusDetail ? (
        <p className="rounded-md border border-status-offline/40 bg-status-offline/5 p-2 text-[12px] text-foreground">
          {model.statusDetail}
        </p>
      ) : null}

      {model.hfUrl ? (
        <a
          href={model.hfUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
        >
          Model card on Hugging Face
          <ArrowUpRight className="h-3 w-3" />
        </a>
      ) : null}

      <LocalModelGate
        model={model}
        open={gateOpen}
        onOpenChange={setGateOpen}
        onConfirm={startDownload}
      />
    </div>
  );
}

export function ModelRail() {
  const expanded = useChatStore(
    (s) => s.expandedSections[LEFT_RAIL_KEY] !== false
  );
  const toggleSection = useChatStore((s) => s.toggleSection);
  const selectedModelId = useChatStore((s) => s.selectedModelId);
  const setSelectedModelId = useChatStore((s) => s.setSelectedModelId);

  const { models, isLoading } = useModels();

  // Default to the first reachable cloud model; don't fall back to an
  // on-device model just because the cloud catalog hasn't loaded yet.
  useEffect(() => {
    if (selectedModelId || models.length === 0) return;
    const best =
      models.find((m) => m.runtime === "cloud" && m.status === "online") ??
      models.find((m) => m.status === "online");
    if (best) {
      setSelectedModelId(best.id);
    } else if (!isLoading) {
      const usable = models.find((m) => m.status !== "offline") ?? models[0];
      setSelectedModelId(usable.id);
    }
  }, [models, isLoading, selectedModelId, setSelectedModelId]);

  const selectedModel = models.find((m) => m.id === selectedModelId);

  if (!expanded) {
    return (
      <aside className="hidden w-10 shrink-0 flex-col border-r border-border bg-background lg:flex">
        <button
          type="button"
          onClick={() => toggleSection(LEFT_RAIL_KEY)}
          className="flex h-9 w-full items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          aria-label="Expand model rail"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
      <div className="flex items-center justify-between px-4 pt-4">
        <SectionLabel>Model</SectionLabel>
        <button
          type="button"
          onClick={() => toggleSection(LEFT_RAIL_KEY)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Collapse model rail"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 pb-4 pt-2">
        <GroupedPicker
          models={models}
          selectedId={selectedModelId}
          onSelect={setSelectedModelId}
        />
      </div>

      <ScrollArea className="flex-1">
        {selectedModel ? (
          <ModelDetail model={selectedModel} />
        ) : (
          <div className="px-4 py-6 text-[12px] text-muted-foreground">
            No model selected.
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-border px-4 py-3">
        <Link
          href="/models"
          className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
        >
          Browse all models
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </aside>
  );
}
