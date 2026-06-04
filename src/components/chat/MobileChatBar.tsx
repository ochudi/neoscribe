"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, ChevronsUpDown, FileText } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/chat/shared";
import { MetadataBody } from "@/components/chat/MetadataRail";
import { cn } from "@/lib/utils";
import { listModels } from "@/lib/api/client";
import { useChatStore } from "@/lib/stores/chatStore";
import type { Model } from "@/lib/api/mocks";

function ModelRow({
  model,
  active,
  onSelect,
}: {
  model: Model;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-foreground bg-muted text-foreground"
          : "border-border text-foreground hover:bg-muted/50"
      )}
    >
      <StatusDot status={model.status} />
      <span className="flex-1 truncate text-[14px]">{model.name}</span>
      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {model.location}
      </span>
      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        {model.sizeLabel}
      </span>
      {active ? <Check className="h-4 w-4 text-foreground" /> : null}
    </button>
  );
}

export function MobileChatBar() {
  const selectedModelId = useChatStore((s) => s.selectedModelId);
  const setSelectedModelId = useChatStore((s) => s.setSelectedModelId);
  const extraction = useChatStore((s) => s.currentExtraction);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["models"],
    queryFn: listModels,
    refetchInterval: 15_000,
  });

  const models = useMemo(() => data ?? [], [data]);
  const selected = models.find((m) => m.id === selectedModelId);

  const grouped = useMemo(() => {
    return {
      cloud: models.filter((m) => m.location === "cloud"),
      edge: models.filter((m) => m.location === "edge"),
    };
  }, [models]);

  return (
    <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-2 lg:hidden">
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-[13px] transition-colors hover:bg-muted/40"
          >
            {selected ? (
              <>
                <StatusDot status={selected.status} />
                <span className="min-w-0 truncate text-foreground">
                  {selected.name}
                </span>
                <span className="ml-auto shrink-0 rounded border border-border px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {selected.sizeLabel}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Select a model</span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[80vh] p-0">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle className="text-left text-[15px] font-medium">
              Choose a model
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="flex flex-col gap-4 p-4">
              {(["cloud", "edge"] as const).map((group) => {
                const items = grouped[group];
                if (items.length === 0) return null;
                return (
                  <div key={group} className="flex flex-col gap-2">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {group}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {items.map((m) => (
                        <ModelRow
                          key={m.id}
                          model={m}
                          active={m.id === selectedModelId}
                          onSelect={() => {
                            setSelectedModelId(m.id);
                            setPickerOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              <Link
                href="/models"
                className="inline-flex items-center gap-1 self-start py-2 text-[13px] text-muted-foreground hover:text-foreground"
              >
                View all models
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Sheet open={metaOpen} onOpenChange={setMetaOpen}>
        <SheetTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={!extraction}
            className="shrink-0"
          >
            <FileText className="h-3.5 w-3.5" />
            Details
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[90vw] p-0 sm:w-[420px]">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle className="text-left text-[15px] font-medium">
              Metadata
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-65px)]">
            <MetadataBody extraction={extraction} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
