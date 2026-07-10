"use client";

import { Columns3, Copy, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExtractionOutput } from "@/components/chat/ExtractionOutput";
import { RuntimeBadge } from "@/components/chat/shared";
import type { RunSummary } from "@/lib/api/types";

interface HistoryDetailSheetProps {
  entry: RunSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenInChat: (entry: RunSummary) => void;
  onCompare: (entry: RunSummary) => void;
  onDelete: (entry: RunSummary) => void;
}

export function HistoryDetailSheet({
  entry,
  open,
  onOpenChange,
  onOpenInChat,
  onCompare,
  onDelete,
}: HistoryDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
      >
        {entry ? (
          <>
            <SheetHeader className="border-b border-border px-6 pb-4 pt-6 text-left">
              <SheetTitle className="flex items-center gap-2 text-[18px] font-semibold leading-tight">
                {entry.modelName}
                <RuntimeBadge runtime={entry.runtime} />
              </SheetTitle>
              <SheetDescription className="font-mono text-[12px] text-muted-foreground">
                {new Date(entry.savedAt).toLocaleString()} ·{" "}
                {entry.inputType === "transcript" ? "Transcript" : "Structured Note"}{" "}
                · {(entry.durationMs / 1000).toFixed(2)}s · {entry.codedCount}/
                {entry.itemCount} coded
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-6 px-6 py-5">
                <section className="flex flex-col gap-2">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Input
                  </p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 font-mono text-[12px] text-foreground">
                    {entry.input || (
                      <span className="italic text-muted-foreground">
                        (empty input)
                      </span>
                    )}
                  </pre>
                </section>

                <section className="flex flex-col gap-2">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Findings
                  </p>
                  <ExtractionOutput extraction={entry.extraction} />
                </section>
              </div>
            </ScrollArea>

            <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-4">
              <Button
                size="sm"
                variant="ghost"
                className="mr-auto h-11 text-status-offline hover:text-status-offline sm:h-9"
                onClick={() => onDelete(entry)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-11 sm:h-9"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      JSON.stringify(entry.extraction, null, 2)
                    );
                    toast.success("JSON copied");
                  } catch {
                    toast.error("Could not copy JSON");
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy JSON
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-11 sm:h-9"
                onClick={() => onCompare(entry)}
              >
                <Columns3 className="h-3.5 w-3.5" />
                Compare
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-11 sm:h-9"
                onClick={() => onOpenInChat(entry)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Open in Workspace
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
