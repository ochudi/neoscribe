"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DEFAULT_FILTERS,
  FiltersBar,
  type HistoryFilters,
} from "@/components/history/FiltersBar";
import {
  HistoryTable,
  type SortColumn,
  type SortState,
} from "@/components/history/HistoryTable";
import { HistoryDetailSheet } from "@/components/history/HistoryDetailSheet";
import {
  matchStatsFor,
  processingSecondsFor,
  useHistoryStore,
  type HistoryEntry,
} from "@/lib/stores/historyStore";
import { useChatStore } from "@/lib/stores/chatStore";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const DEFAULT_SORT: SortState = { column: "savedAt", direction: "desc" };

function dayBoundary(date: string, end: boolean) {
  // date is "YYYY-MM-DD"; convert to ms at local-day start or end.
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  return end
    ? new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
    : new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function applyFilters(
  entries: HistoryEntry[],
  filters: HistoryFilters
): HistoryEntry[] {
  const q = filters.search.trim().toLowerCase();
  const fromMs = dayBoundary(filters.dateFrom, false);
  const toMs = dayBoundary(filters.dateTo, true);
  return entries.filter((e) => {
    if (q && !e.input.toLowerCase().includes(q)) return false;
    if (filters.modelIds.length > 0 && !filters.modelIds.includes(e.modelId))
      return false;
    const savedMs = new Date(e.savedAt).getTime();
    if (fromMs !== null && savedMs < fromMs) return false;
    if (toMs !== null && savedMs > toMs) return false;
    const { matched, total } = matchStatsFor(e);
    const pct = total === 0 ? 0 : Math.round((matched / total) * 100);
    if (pct < filters.minRate || pct > filters.maxRate) return false;
    return true;
  });
}

function sortEntries(
  entries: HistoryEntry[],
  sort: SortState
): HistoryEntry[] {
  const mul = sort.direction === "asc" ? 1 : -1;
  const copy = [...entries];
  copy.sort((a, b) => {
    switch (sort.column) {
      case "savedAt":
        return (
          (new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()) * mul
        );
      case "model":
        return a.modelName.localeCompare(b.modelName) * mul;
      case "inputType":
        return a.inputType.localeCompare(b.inputType) * mul;
      case "input":
        return a.input.localeCompare(b.input) * mul;
      case "duration":
        return (processingSecondsFor(a) - processingSecondsFor(b)) * mul;
      case "matchRate": {
        const ar = matchStatsFor(a);
        const br = matchStatsFor(b);
        const aPct = ar.total === 0 ? 0 : ar.matched / ar.total;
        const bPct = br.total === 0 ? 0 : br.matched / br.total;
        return (aPct - bPct) * mul;
      }
      default:
        return 0;
    }
  });
  return copy;
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(entries: HistoryEntry[]) {
  const header = [
    "id",
    "savedAt",
    "modelId",
    "modelName",
    "inputType",
    "inputLength",
    "durationS",
    "matched",
    "total",
    "matchRate",
  ].join(",");
  const rows = entries.map((e) => {
    const { matched, total } = matchStatsFor(e);
    const rate = total === 0 ? 0 : matched / total;
    return [
      e.id,
      e.savedAt,
      e.modelId,
      csvEscape(e.modelName),
      e.inputType,
      String(e.input.length),
      processingSecondsFor(e).toFixed(3),
      String(matched),
      String(total),
      rate.toFixed(4),
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function HydrationSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-24 w-full animate-pulse rounded-md bg-muted/40" />
      <div className="h-72 w-full animate-pulse rounded-md bg-muted/40" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-md border border-border bg-background p-8 text-center">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <p className="text-[14px] text-foreground">
          No saved extractions yet.
        </p>
        <p className="text-[12px] text-muted-foreground">
          Save a run from the Chat workspace and it will appear here.
        </p>
        <Button asChild size="sm">
          <Link href="/chat">Run your first extraction →</Link>
        </Button>
      </div>
    </div>
  );
}

function NoFilterMatch({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-md border border-border bg-background p-6 text-center">
        <p className="text-[14px] text-foreground">
          No saved extractions match these filters.
        </p>
        <Button size="sm" variant="outline" onClick={onClear}>
          Reset filters
        </Button>
      </div>
    </div>
  );
}

function HistoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasHydrated = useHistoryStore((s) => s._hasHydrated);
  const entries = useHistoryStore((s) => s.entries);
  const removeEntry = useHistoryStore((s) => s.removeEntry);

  const setInputContent = useChatStore((s) => s.setInputContent);
  const setInputType = useChatStore((s) => s.setInputType);
  const setSelectedModelId = useChatStore((s) => s.setSelectedModelId);
  const setExtraction = useChatStore((s) => s.setExtraction);

  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [activeEntry, setActiveEntry] = useState<HistoryEntry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Auto-open detail sheet when ?run=<id> matches an entry.
  useEffect(() => {
    if (!hasHydrated) return;
    const runParam = searchParams.get("run");
    if (!runParam) return;
    const match = entries.find((e) => e.id === runParam);
    if (match) {
      setActiveEntry(match);
      setSheetOpen(true);
    }
  }, [hasHydrated, entries, searchParams]);

  // Reset to page 1 whenever filters or sort change.
  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  const modelOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of entries) {
      if (!seen.has(e.modelId)) seen.set(e.modelId, e.modelName);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [entries]);

  const filtered = useMemo(
    () => applyFilters(entries, filters),
    [entries, filters]
  );
  const sorted = useMemo(() => sortEntries(filtered, sort), [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageEntries = useMemo(
    () =>
      sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sorted, safePage]
  );

  const handleSortChange = (column: SortColumn) => {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: column === "savedAt" ? "desc" : "asc" }
    );
  };

  const handleOpen = (entry: HistoryEntry) => {
    setActiveEntry(entry);
    setSheetOpen(true);
  };

  const handleDelete = (entry: HistoryEntry) => {
    removeEntry(entry.id);
    if (activeEntry?.id === entry.id) {
      setSheetOpen(false);
      setActiveEntry(null);
    }
    toast.success("Entry deleted");
  };

  const handleRerun = (entry: HistoryEntry) => {
    setInputContent(entry.input);
    setInputType(entry.inputType);
    setSelectedModelId(entry.modelId);
    setExtraction(null);
    toast.success(`Loaded into chat — ${entry.modelName}`);
    router.push("/chat");
  };

  const handleOpenInChat = (entry: HistoryEntry) => {
    setInputContent(entry.input);
    setInputType(entry.inputType);
    setSelectedModelId(entry.modelId);
    setExtraction(entry.extraction);
    setSheetOpen(false);
    router.push("/chat");
  };

  const handleCompare = (entry: HistoryEntry) => {
    setInputContent(entry.input);
    setInputType(entry.inputType);
    setSheetOpen(false);
    router.push(`/compare?model=${encodeURIComponent(entry.modelId)}`);
  };

  const handleExport = (formatChoice: "csv" | "json") => {
    const today = format(new Date(), "yyyy-MM-dd");
    if (formatChoice === "csv") {
      downloadBlob(
        buildCsv(entries),
        `neoscribe-history-${today}.csv`,
        "text/csv"
      );
      toast.success("Exported as CSV");
    } else {
      downloadBlob(
        JSON.stringify(entries, null, 2),
        `neoscribe-history-${today}.json`,
        "application/json"
      );
      toast.success("Exported as JSON");
    }
  };

  return (
    <PageContainer
      title="History"
      description="Every extraction you've saved. Filter, search, re-run, or export."
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={entries.length === 0}>
              <Download className="h-3.5 w-3.5" />
              Export all
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => handleExport("csv")}>
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleExport("json")}>
              JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <div className="flex flex-col gap-4">
        {!hasHydrated ? (
          <HydrationSkeleton />
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <FiltersBar
              filters={filters}
              onChange={setFilters}
              modelOptions={modelOptions}
            />

            <div className="flex items-center justify-between">
              <span className="font-mono text-[12px] text-muted-foreground">
                Showing {pageEntries.length} of {sorted.length}{" "}
                {sorted.length === 1 ? "entry" : "entries"}
                {sorted.length !== entries.length
                  ? ` (filtered from ${entries.length})`
                  : ""}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className={cn("px-2")}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="font-mono text-[12px] text-muted-foreground">
                  Page {safePage} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={safePage >= totalPages}
                  className={cn("px-2")}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {sorted.length === 0 ? (
              <NoFilterMatch
                onClear={() => setFilters(DEFAULT_FILTERS)}
              />
            ) : (
              <HistoryTable
                entries={pageEntries}
                sort={sort}
                onSortChange={handleSortChange}
                onOpen={handleOpen}
                onRerun={handleRerun}
                onDelete={handleDelete}
              />
            )}
          </>
        )}

        <HistoryDetailSheet
          entry={activeEntry}
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setActiveEntry(null);
          }}
          onOpenInChat={handleOpenInChat}
          onCompare={handleCompare}
          onDelete={handleDelete}
        />
      </div>
    </PageContainer>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryPageContent />
    </Suspense>
  );
}
