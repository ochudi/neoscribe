"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  EXTRACTION_CATEGORIES,
  type ExtractionCategory,
} from "@/lib/constants";
import type { ExtractionItem, ExtractionResult } from "@/lib/api/mocks";

type SortMode = "order" | "category" | "match_status";

const SORT_LABELS: Record<SortMode, string> = {
  order: "Order",
  category: "Category",
  match_status: "Match status",
};

export interface ItemAnnotation {
  onlyInLabel?: string;
}

export interface CategoryAnnotation {
  highlight?: boolean;
  perModelCounts?: { label: string; count: number }[];
}

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

function itemToText(item: ExtractionItem) {
  if (item.matchStatus === "matched") {
    return item.matchedCode
      ? `${item.text} (${item.matchedCode})`
      : item.text;
  }
  return `${item.text} (no match)`;
}

function sectionToText(category: ExtractionCategory, items: ExtractionItem[]) {
  const header = `## ${CATEGORY_LABELS[category]} (${items.length})`;
  if (items.length === 0) return `${header}\n_No items extracted._`;
  return [header, ...items.map((i) => `- ${itemToText(i)}`)].join("\n");
}

function noMatchCount(items: ExtractionItem[]) {
  return items.filter((i) => i.matchStatus === "no_match").length;
}

function defaultExpandedMap(
  results: Record<ExtractionCategory, ExtractionItem[]>,
  compact: boolean
): Record<ExtractionCategory, boolean> {
  const next = {} as Record<ExtractionCategory, boolean>;
  for (const category of EXTRACTION_CATEGORIES) {
    const items = results[category] ?? [];
    if (items.length === 0) {
      next[category] = false;
    } else if (compact) {
      next[category] = true;
    } else {
      next[category] = noMatchCount(items) > 0;
    }
  }
  return next;
}

interface RowProps {
  index: number;
  item: ExtractionItem;
  compact: boolean;
  annotation?: ItemAnnotation;
}

function ItemRow({ index, item, compact, annotation }: RowProps) {
  const isMatched = item.matchStatus === "matched";
  return (
    <div
      className={cn(
        "group/row flex items-start gap-3 text-foreground",
        compact ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-[14px]",
        !isMatched && "border-l-2 border-dotted border-status-loading/70"
      )}
    >
      <span
        className={cn(
          "shrink-0 pt-0.5 font-mono text-muted-foreground",
          compact ? "w-6 text-[11px]" : "w-7 text-[12px]"
        )}
      >
        {String(index).padStart(2, "0")}
      </span>

      <span className="min-w-0 flex-1 leading-snug">
        {item.text || (
          <span className="italic text-muted-foreground">No content</span>
        )}
        {annotation?.onlyInLabel ? (
          <span className="ml-2 inline-flex items-center rounded border border-status-loading/40 bg-status-loading/10 px-1.5 py-0.5 align-middle font-mono text-[10px] uppercase tracking-wider text-status-loading">
            {annotation.onlyInLabel}
          </span>
        ) : null}
      </span>

      <span className="flex shrink-0 items-center gap-2 pt-0.5">
        {isMatched ? (
          <>
            <Check className="h-3.5 w-3.5 text-status-online" />
            {item.matchedCode ? (
              <span className="font-mono text-[11px] text-muted-foreground">
                {item.matchedCode}
              </span>
            ) : null}
          </>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-wider text-status-loading">
            No_match
          </span>
        )}
        <button
          type="button"
          onClick={() => copyText(itemToText(item), "Item")}
          className="opacity-0 transition-opacity hover:text-foreground group-hover/row:opacity-100 focus-visible:opacity-100 text-muted-foreground"
          aria-label="Copy item"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  );
}

interface CategorySectionProps {
  category: ExtractionCategory;
  items: ExtractionItem[];
  expanded: boolean;
  compact: boolean;
  onToggle: () => void;
  categoryAnnotation?: CategoryAnnotation;
  itemAnnotations?: Record<string, ItemAnnotation>;
}

function CategorySection({
  category,
  items,
  expanded,
  compact,
  onToggle,
  categoryAnnotation,
  itemAnnotations,
}: CategorySectionProps) {
  const isEmpty = items.length === 0;
  const unmatched = noMatchCount(items);
  const allMatched = !isEmpty && unmatched === 0;
  const highlight = !!categoryAnnotation?.highlight;

  const headerClasses = cn(
    "flex w-full items-center justify-between gap-3 text-left",
    compact ? "px-3 py-2" : "px-4 py-3",
    !isEmpty && "hover:bg-muted/40",
    isEmpty && "cursor-default"
  );

  return (
    <section
      className={cn(
        "overflow-hidden rounded-md border bg-background",
        highlight ? "border-foreground" : "border-border"
      )}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={isEmpty ? undefined : onToggle}
          aria-expanded={expanded}
          aria-disabled={isEmpty || undefined}
          disabled={isEmpty}
          className={headerClasses}
        >
          <span className="flex min-w-0 items-center gap-2">
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                expanded ? "rotate-0" : "-rotate-90",
                isEmpty && "opacity-40"
              )}
            />
            <span
              className={cn(
                "leading-tight font-semibold",
                compact ? "text-[13px]" : "text-[14px]",
                isEmpty ? "text-muted-foreground" : "text-foreground",
                highlight && "font-bold"
              )}
            >
              {CATEGORY_LABELS[category]}
            </span>
            <span
              className={cn(
                "font-mono text-muted-foreground",
                compact ? "text-[11px]" : "text-[12px]",
                highlight && "font-bold text-foreground"
              )}
            >
              ({items.length})
            </span>
            {categoryAnnotation?.perModelCounts &&
            categoryAnnotation.perModelCounts.length > 0 ? (
              <span className="font-mono text-[10px] text-muted-foreground">
                ·{" "}
                {categoryAnnotation.perModelCounts
                  .map((c) => `${c.label}:${c.count}`)
                  .join(" ")}
              </span>
            ) : null}
          </span>

          {!isEmpty ? (
            allMatched ? (
              <span className="flex items-center gap-1 text-[12px] text-status-online">
                <Check className="h-3.5 w-3.5" />
                All matched
              </span>
            ) : (
              <span className="text-[12px] text-status-loading">
                {unmatched} unmatched
              </span>
            )
          ) : (
            <span className="text-[12px] text-muted-foreground">No items</span>
          )}
        </button>

        {!isEmpty ? (
          <Button
            size="sm"
            variant="ghost"
            className="mr-2 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              copyText(sectionToText(category, items), CATEGORY_LABELS[category]);
            }}
            aria-label={`Copy all ${CATEGORY_LABELS[category]} items`}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {!isEmpty && expanded ? (
        <div className="divide-y divide-border border-t border-border">
          {items.map((item, i) => (
            <ItemRow
              key={item.id}
              index={i + 1}
              item={item}
              compact={compact}
              annotation={itemAnnotations?.[item.id]}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

interface ExtractionOutputProps {
  extraction: ExtractionResult;
  compact?: boolean;
  /** Per-category annotations keyed by ExtractionCategory. */
  categoryAnnotations?: Partial<Record<ExtractionCategory, CategoryAnnotation>>;
  /** Per-item annotations keyed by item.id. */
  itemAnnotations?: Record<string, ItemAnnotation>;
}

export function ExtractionOutput({
  extraction,
  compact = false,
  categoryAnnotations,
  itemAnnotations,
}: ExtractionOutputProps) {
  const [expandedMap, setExpandedMap] = useState<
    Record<ExtractionCategory, boolean>
  >(() => defaultExpandedMap(extraction.results, compact));
  const [onlyNoMatch, setOnlyNoMatch] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("order");

  useEffect(() => {
    setExpandedMap(defaultExpandedMap(extraction.results, compact));
  }, [extraction.startedAt, extraction.results, compact]);

  const orderedCategories = useMemo<ExtractionCategory[]>(() => {
    const base = [...EXTRACTION_CATEGORIES];
    if (sortMode === "order" || compact) return base;
    if (sortMode === "category") {
      return base.sort((a, b) =>
        CATEGORY_LABELS[a].localeCompare(CATEGORY_LABELS[b])
      );
    }
    return base.sort((a, b) => {
      const ia = extraction.results[a] ?? [];
      const ib = extraction.results[b] ?? [];
      const emptyA = ia.length === 0 ? 1 : 0;
      const emptyB = ib.length === 0 ? 1 : 0;
      if (emptyA !== emptyB) return emptyA - emptyB;
      const diff = noMatchCount(ib) - noMatchCount(ia);
      if (diff !== 0) return diff;
      return EXTRACTION_CATEGORIES.indexOf(a) - EXTRACTION_CATEGORIES.indexOf(b);
    });
  }, [sortMode, compact, extraction.results]);

  const visibleSections = useMemo(() => {
    return orderedCategories
      .map((category) => {
        const all = extraction.results[category] ?? [];
        const items =
          onlyNoMatch && !compact
            ? all.filter((i) => i.matchStatus === "no_match")
            : all;
        return { category, items, originalCount: all.length };
      })
      .filter(({ items, originalCount }) => {
        if (compact) return originalCount >= 0;
        if (onlyNoMatch) return items.length > 0;
        return originalCount >= 0;
      });
  }, [orderedCategories, extraction.results, onlyNoMatch, compact]);

  const expandableCategories = useMemo(
    () =>
      EXTRACTION_CATEGORIES.filter(
        (c) => (extraction.results[c] ?? []).length > 0
      ),
    [extraction.results]
  );

  const setAllExpanded = (value: boolean) => {
    setExpandedMap((prev) => {
      const next = { ...prev };
      for (const c of expandableCategories) next[c] = value;
      return next;
    });
  };

  const toggle = (category: ExtractionCategory) => {
    setExpandedMap((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  return (
    <div className={cn("flex flex-col", compact ? "gap-2" : "gap-4")}>
      {!compact ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAllExpanded(true)}
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            Expand all
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAllExpanded(false)}
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
            Collapse all
          </Button>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1">
              <Switch
                id="only-no-match"
                checked={onlyNoMatch}
                onCheckedChange={setOnlyNoMatch}
              />
              <Label
                htmlFor="only-no-match"
                className="cursor-pointer text-[13px] text-foreground"
              >
                Show only NO_MATCH
              </Label>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  Sort: {SORT_LABELS[sortMode]}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Sort by
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sortMode}
                  onValueChange={(v) => setSortMode(v as SortMode)}
                >
                  <DropdownMenuRadioItem value="order">
                    Order
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="category">
                    Category
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="match_status">
                    Match status
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setSortMode("order");
                    setOnlyNoMatch(false);
                    setExpandedMap(defaultExpandedMap(extraction.results, false));
                  }}
                >
                  Reset view
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {visibleSections.length === 0 ? (
          <div className="rounded-md border border-border bg-background px-4 py-8 text-center text-[13px] text-muted-foreground">
            No items match the current filter.
          </div>
        ) : (
          visibleSections.map(({ category, items }) => (
            <CategorySection
              key={category}
              category={category}
              items={items}
              expanded={!!expandedMap[category]}
              compact={compact}
              onToggle={() => toggle(category)}
              categoryAnnotation={categoryAnnotations?.[category]}
              itemAnnotations={itemAnnotations}
            />
          ))
        )}
      </div>
    </div>
  );
}
