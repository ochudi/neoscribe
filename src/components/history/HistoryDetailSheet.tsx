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
import {
  matchStatsFor,
  processingSecondsFor,
  type HistoryEntry,
} from "@/lib/stores/historyStore";

interface HistoryDetailSheetProps {
  entry: HistoryEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenInChat: (entry: HistoryEntry) => void;
  onCompare: (entry: HistoryEntry) => void;
  onDelete: (entry: HistoryEntry) => void;
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
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
              <SheetTitle className="text-[18px] font-semibold leading-tight">
                {entry.modelName}
              </SheetTitle>
              <SheetDescription className="font-mono text-[12px] text-muted-foreground">
                {formatTimestamp(entry.savedAt)} ·{" "}
                {entry.inputType === "transcript"
                  ? "Transcript"
                  : "Structured Note"}{" "}
                · {processingSecondsFor(entry).toFixed(2)}s ·{" "}
                {(() => {
                  const { matched, total } = matchStatsFor(entry);
                  return `${matched}/${total} matched`;
                })()}
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-6 px-6 py-5">
                <section className="flex flex-col gap-2">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
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
                  <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    Extraction
                  </p>
                  <ExtractionOutput extraction={entry.extraction} />
                </section>
              </div>
            </ScrollArea>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenInChat(entry)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Open in Chat
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCompare(entry)}
              >
                <Columns3 className="h-3.5 w-3.5" />
                Compare with another model
              </Button>
              <Button
                size="sm"
                variant="ghost"
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
                variant="ghost"
                className="text-status-offline hover:text-status-offline"
                onClick={() => onDelete(entry)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
