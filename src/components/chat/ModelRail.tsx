"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Cpu } from "lucide-react";

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
import {
  CAPABILITY_META,
  STATUS_META,
  StatusDot,
  formatMemory,
  relativeShort,
} from "@/components/chat/shared";
import { cn } from "@/lib/utils";
import { listModels } from "@/lib/api/client";
import { useChatStore, LEFT_RAIL_KEY } from "@/lib/stores/chatStore";
import type { Model } from "@/lib/api/mocks";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function GroupedPicker({
  models,
  selectedId,
  onSelect,
}: {
  models: Model[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const selected = models.find((m) => m.id === selectedId);

  const grouped = useMemo(() => {
    return {
      cloud: models.filter((m) => m.location === "cloud"),
      edge: models.filter((m) => m.location === "edge"),
    };
  }, [models]);

  const triggerLabel = selected ? selected.name : "Select a model";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-[13px] transition-colors",
          "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected ? <StatusDot status={selected.status} /> : <Cpu className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="truncate text-foreground">{triggerLabel}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        {(["cloud", "edge"] as const).map((group, gi) => {
          const items = grouped[group];
          if (items.length === 0) return null;
          return (
            <DropdownMenuGroup key={group}>
              {gi > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {group}
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
                  <span className="rounded border border-border px-1 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {m.location}
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

function ModelDetail({ model }: { model: Model }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const status = STATUS_META[model.status];

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

      <div className="flex items-center gap-2">
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground">
          {model.location}
        </span>
        <span className="font-mono text-[12px] text-muted-foreground">
          {model.provider}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {model.capabilities.map((cap) => {
          const meta = CAPABILITY_META[cap];
          const Icon = meta.icon;
          return (
            <span
              key={cap}
              className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-foreground"
            >
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
          );
        })}
      </div>

      {model.location === "edge" && model.sizeMb ? (
        <p className="font-mono text-[12px] text-muted-foreground">
          Memory: {formatMemory(model.sizeMb)}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="flex items-center gap-1.5">
          <StatusDot status={model.status} />
          <span className="text-foreground">{status.label}</span>
        </span>
        <span className="font-mono text-muted-foreground">
          {relativeShort(model.lastCheckedAt, nowMs)}
        </span>
      </div>
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

  const { data } = useQuery({
    queryKey: ["models"],
    queryFn: listModels,
    refetchInterval: 15_000,
  });

  const models = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    if (!selectedModelId && models.length > 0) {
      const firstOnline =
        models.find((m) => m.status === "online") ?? models[0];
      setSelectedModelId(firstOnline.id);
    }
  }, [models, selectedModelId, setSelectedModelId]);

  const selectedModel = models.find((m) => m.id === selectedModelId);

  if (!expanded) {
    return (
      <aside className="flex w-10 shrink-0 flex-col border-r border-border bg-background">
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
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-background">
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
          View all models
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </aside>
  );
}
