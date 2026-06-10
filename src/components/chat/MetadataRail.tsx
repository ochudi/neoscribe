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
} from "@/lib/constants";
import {
  flattenExtraction,
  processingSeconds,
  type ExtractionResult,
} from "@/lib/api/types";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function CodedBar({ coded, total }: { coded: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((coded / total) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-status-online transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        {coded} coded · {total - coded} uncoded · {total} findings
      </p>
    </div>
  );
}

function PerSection({ extraction }: { extraction: ExtractionResult }) {
  return (
    <div className="flex flex-col gap-1.5">
      {EXTRACTION_CATEGORIES.map((category) => {
        const items = extraction.results[category] ?? [];
        const coded = items.filter((i) => i.matchStatus === "matched").length;
        const isEmpty = items.length === 0;
        return (
          <div key={category} className="flex items-center justify-between gap-2">
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
              {isEmpty ? "—" : `${coded}/${items.length} coded`}
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
        const code = item.matchedCode ? ` — ${item.matchedCode}` : "";
        lines.push(`- ${item.text}${code}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
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

export function MetadataBody({
  extraction,
}: {
  extraction: ExtractionResult | null;
}) {
  const [rawOpen, setRawOpen] = useState(false);

  if (!extraction) {
    return (
      <div className="px-4 py-6 text-[12px] leading-relaxed text-muted-foreground">
        Run an extraction to see timing, coding coverage, and export options
        here.
      </div>
    );
  }

  const allItems = flattenExtraction(extraction);
  const coded = allItems.filter((i) => i.matchStatus === "matched").length;
  const total = allItems.length;

  return (
    <>
      <div className="flex flex-col gap-5 px-4 py-4">
        <div>
          <SectionLabel>Processing time</SectionLabel>
          <p className="mt-1 font-mono text-[28px] font-medium leading-tight text-foreground">
            {processingSeconds(extraction).toFixed(2)}s
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>Code suggestions</SectionLabel>
          <CodedBar coded={coded} total={total} />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Codes are suggested by the model (ICD-10 / SNOMED / RxNorm) and are
            not validated against a terminology server.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>Per section</SectionLabel>
          <PerSection extraction={extraction} />
        </div>

        <div className="flex flex-col gap-2">
          <SectionLabel>Export</SectionLabel>
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
            onClick={() => copyToClipboard(buildMarkdown(extraction), "Markdown")}
            className="justify-start"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy as Markdown
          </Button>
        </div>
      </div>

      <RawJsonDialog open={rawOpen} onOpenChange={setRawOpen} extraction={extraction} />
    </>
  );
}

export function MetadataRail() {
  const expanded = useChatStore(
    (s) => s.expandedSections[RIGHT_RAIL_KEY] !== false
  );
  const toggleSection = useChatStore((s) => s.toggleSection);
  const extraction = useChatStore((s) => s.currentExtraction);

  if (!expanded) {
    return (
      <aside className="hidden w-10 shrink-0 flex-col border-l border-border bg-background lg:flex">
        <button
          type="button"
          onClick={() => toggleSection(RIGHT_RAIL_KEY)}
          className="flex h-9 w-full items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          aria-label="Expand details rail"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-background lg:flex">
      <div className="flex items-center justify-between px-4 pt-4">
        <SectionLabel>Run details</SectionLabel>
        <button
          type="button"
          onClick={() => toggleSection(RIGHT_RAIL_KEY)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Collapse details rail"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <MetadataBody extraction={extraction} />
      </ScrollArea>
    </aside>
  );
}
