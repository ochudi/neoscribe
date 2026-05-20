"use client";

import { useMemo, useState } from "react";
import { Braces, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChatStore, RIGHT_RAIL_KEY } from "@/lib/stores/chatStore";
import {
  CATEGORY_LABELS,
  EXTRACTION_CATEGORIES,
  type ExtractionCategory,
} from "@/lib/constants";
import type { ExtractionItem, ExtractionResult } from "@/lib/api/mocks";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function processingSeconds(extraction: ExtractionResult) {
  const ms =
    new Date(extraction.completedAt).getTime() -
    new Date(extraction.startedAt).getTime();
  return Math.max(0, ms) / 1000;
}

function flattenItems(extraction: ExtractionResult): ExtractionItem[] {
  return EXTRACTION_CATEGORIES.flatMap((c) => extraction.results[c] ?? []);
}

function MatchBar({
  matched,
  total,
}: {
  matched: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((matched / total) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-status-online transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        {matched} matched · {total - matched} no match · {total} total
      </p>
    </div>
  );
}

function PerSection({ extraction }: { extraction: ExtractionResult }) {
  return (
    <div className="flex flex-col gap-1.5">
      {EXTRACTION_CATEGORIES.map((category) => {
        const items = extraction.results[category] ?? [];
        const matched = items.filter(
          (i) => i.matchStatus === "matched"
        ).length;
        const isEmpty = items.length === 0;
        return (
          <div
            key={category}
            className="flex items-center justify-between gap-2"
          >
            <span
              className={
                isEmpty
                  ? "truncate text-[12px] text-muted-foreground"
                  : "truncate text-[12px] text-foreground"
              }
            >
              {CATEGORY_LABELS[category]}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {isEmpty ? "—" : `${matched}/${items.length}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function buildMarkdown(extraction: ExtractionResult) {
  const lines: string[] = [
    `# Extraction — ${extraction.modelId}`,
    "",
    `- Started: ${extraction.startedAt}`,
    `- Completed: ${extraction.completedAt}`,
    "",
  ];
  for (const category of EXTRACTION_CATEGORIES) {
    const items = extraction.results[category] ?? [];
    lines.push(`## ${CATEGORY_LABELS[category]} (${items.length})`);
    if (items.length === 0) {
      lines.push("_No items extracted._");
    } else {
      for (const item of items) {
        const tag = item.matchStatus === "matched" ? "matched" : "no_match";
        const code = item.matchedCode ? ` (${item.matchedCode})` : "";
        lines.push(`- [${tag}] ${item.text}${code}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

function buildTable(extraction: ExtractionResult) {
  const header = "category\titem_id\tmatch\tcode\tconfidence\ttext";
  const rows: string[] = [];
  for (const category of EXTRACTION_CATEGORIES) {
    const items = extraction.results[category] ?? [];
    for (const item of items) {
      rows.push(
        [
          category,
          item.id,
          item.matchStatus,
          item.matchedCode ?? "",
          item.confidence?.toFixed(2) ?? "",
          item.text.replace(/\t/g, " "),
        ].join("\t")
      );
    }
  }
  return [header, ...rows].join("\n");
}

async function copyToClipboard(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

function RawJsonDialog({
  open,
  onOpenChange,
  extraction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extraction: ExtractionResult;
}) {
  const json = useMemo(() => JSON.stringify(extraction, null, 2), [extraction]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Raw extraction response</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <ScrollArea className="h-[60vh] rounded-md border border-border bg-muted/30">
            <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[12px] text-foreground">
              {json}
            </pre>
          </ScrollArea>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(json, "JSON")}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy JSON
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MetadataRail() {
  const expanded = useChatStore(
    (s) => s.expandedSections[RIGHT_RAIL_KEY] !== false
  );
  const toggleSection = useChatStore((s) => s.toggleSection);
  const extraction = useChatStore((s) => s.currentExtraction);

  const [rawOpen, setRawOpen] = useState(false);

  if (!expanded) {
    return (
      <aside className="flex w-10 shrink-0 flex-col border-l border-border bg-background">
        <button
          type="button"
          onClick={() => toggleSection(RIGHT_RAIL_KEY)}
          className="flex h-9 w-full items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          aria-label="Expand metadata rail"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  const allItems = extraction ? flattenItems(extraction) : [];
  const matched = allItems.filter((i) => i.matchStatus === "matched").length;
  const total = allItems.length;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between px-4 pt-4">
        <SectionLabel>Metadata</SectionLabel>
        <button
          type="button"
          onClick={() => toggleSection(RIGHT_RAIL_KEY)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Collapse metadata rail"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        {!extraction ? (
          <div className="px-4 py-6 text-[12px] text-muted-foreground">
            Metadata will appear after an extraction completes.
          </div>
        ) : (
          <div className="flex flex-col gap-5 px-4 py-4">
            <div>
              <SectionLabel>Processing time</SectionLabel>
              <p className="mt-1 font-mono text-[28px] font-medium leading-tight text-foreground">
                {processingSeconds(extraction).toFixed(2)}s
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>Match summary</SectionLabel>
              <MatchBar matched={matched} total={total} />
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>Per section</SectionLabel>
              <PerSection extraction={extraction} />
            </div>

            <div className="flex flex-col gap-2">
              <SectionLabel>Actions</SectionLabel>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRawOpen(true)}
                className="justify-start"
              >
                <Braces className="h-3.5 w-3.5" />
                View raw JSON
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  copyToClipboard(JSON.stringify(extraction, null, 2), "JSON")
                }
                className="justify-start"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy JSON
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  copyToClipboard(buildMarkdown(extraction), "Markdown")
                }
                className="justify-start"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy as Markdown
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  copyToClipboard(buildTable(extraction), "Table")
                }
                className="justify-start"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy as table
              </Button>
            </div>
          </div>
        )}
      </ScrollArea>

      {extraction ? (
        <RawJsonDialog
          open={rawOpen}
          onOpenChange={setRawOpen}
          extraction={extraction}
        />
      ) : null}
    </aside>
  );
}

// Exported so other modules can reuse the same category-aware traversal.
export type { ExtractionCategory };
