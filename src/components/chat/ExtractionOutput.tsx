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
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  EXTRACTION_CATEGORIES,
  type ExtractionCategory,
} from "@/lib/constants";
import type { ExtractionItem, ExtractionResult } from "@/lib/api/types";

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
  return item.matchedCode ? `${item.text} (${item.matchedCode})` : item.text;
}

function sectionToText(category: ExtractionCategory, items: ExtractionItem[]) {
  const header = `## ${CATEGORY_LABELS[category]} (${items.length})`;
  if (items.length === 0) return `${header}\n_No items extracted._`;
  return [header, ...items.map((i) => `- ${itemToText(i)}`)].join("\n");
}

function uncodedCount(items: ExtractionItem[]) {
  return items.filter((i) => i.matchStatus === "no_match").length;
}

function defaultExpandedMap(
  results: Record<ExtractionCategory, ExtractionItem[]>
): Record<ExtractionCategory, boolean> {
  const next = {} as Record<ExtractionCategory, boolean>;
  for (const category of EXTRACTION_CATEGORIES) {
    next[category] = (results[category] ?? []).length > 0;
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
  const isCoded = item.matchStatus === "matched";
  return (
    <div
      className={cn(
        "group/row flex items-start gap-3 text-foreground",
        compact ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-[14px]"
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
        {isCoded ? (
          <span
            className="inline-flex items-center gap-1 rounded border border-status-online/30 bg-status-online/10 px-1.5 py-0.5 font-mono text-[11px] text-status-online"
            title="Code suggested by the model — not yet validated"
          >
            <Check className="h-3 w-3" />
            {item.matchedCode}
          </span>
        ) : (
          <span
            className="font-mono text-[11px] text-muted-foreground"
            title="The model did not suggest a clinical code for this finding"
          >
            no code
          </span>
        )}
        <button
          type="button"
          onClick={() => copyText(itemToText(item), "Item")}
          className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100"
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
  const uncoded = uncodedCount(items);
  const allCoded = !isEmpty && uncoded === 0;
  const highlight = !!categoryAnnotation?.highlight;

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
          disabled={isEmpty}
          className={cn(
            "flex w-full items-center justify-between gap-3 text-left",
            compact ? "px-3 py-2" : "px-4 py-3",
            !isEmpty && "hover:bg-muted/40",
            isEmpty && "cursor-default"
          )}
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
                "font-semibold leading-tight",
                compact ? "text-[13px]" : "text-[14px]",
                isEmpty ? "text-muted-foreground" : "text-foreground"
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
              <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                ·{" "}
                {categoryAnnotation.perModelCounts
                  .map((c) => `${c.label}:${c.count}`)
                  .join(" ")}
              </span>
            ) : null}
          </span>

          {!isEmpty ? (
            allCoded ? (
              <span className="flex shrink-0 items-center gap-1 text-[12px] text-status-online">
                <Check className="h-3.5 w-3.5" />
                All coded
              </span>
            ) : (
              <span className="shrink-0 text-[12px] text-muted-foreground">
                {uncoded} without code
              </span>
            )
          ) : (
            <span className="shrink-0 text-[12px] text-muted-foreground">
              None found
            </span>
          )}
        </button>

        {!isEmpty ? (
          <Button
            size="sm"
            variant="ghost"
            className="mr-2 shrink-0"
            onClick={() =>
              copyText(sectionToText(category, items), CATEGORY_LABELS[category])
            }
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
  categoryAnnotations?: Partial<Record<ExtractionCategory, CategoryAnnotation>>;
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
  >(() => defaultExpandedMap(extraction.results));
  const [onlyUncoded, setOnlyUncoded] = useState(false);

  useEffect(() => {
    setExpandedMap(defaultExpandedMap(extraction.results));
    setOnlyUncoded(false);
  }, [extraction.startedAt, extraction.results]);

  const visibleSections = useMemo(() => {
    return EXTRACTION_CATEGORIES.map((category) => {
      const all = extraction.results[category] ?? [];
      const items =
        onlyUncoded && !compact
          ? all.filter((i) => i.matchStatus === "no_match")
          : all;
      return { category, items, originalCount: all.length };
    }).filter(({ items }) => !onlyUncoded || compact || items.length > 0);
  }, [extraction.results, onlyUncoded, compact]);

  const expandableCategories = useMemo(
    () =>
      EXTRACTION_CATEGORIES.filter(
        (c) => (extraction.results[c] ?? []).length > 0
      ),
    [extraction.results]
  );

  const anyUncoded = useMemo(
    () =>
      EXTRACTION_CATEGORIES.some((c) =>
        (extraction.results[c] ?? []).some((i) => i.matchStatus === "no_match")
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
          <Button size="sm" variant="ghost" onClick={() => setAllExpanded(true)}>
            <ChevronsUpDown className="h-3.5 w-3.5" />
            Expand all
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAllExpanded(false)}>
            <ChevronsDownUp className="h-3.5 w-3.5" />
            Collapse all
          </Button>

          {anyUncoded ? (
            <div className="ml-auto flex items-center gap-2 rounded-md border border-border px-3 py-1">
              <Switch
                id="only-uncoded"
                checked={onlyUncoded}
                onCheckedChange={setOnlyUncoded}
              />
              <Label
                htmlFor="only-uncoded"
                className="cursor-pointer text-[13px] text-foreground"
              >
                Only findings without a code
              </Label>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {visibleSections.length === 0 ? (
          <div className="rounded-md border border-border bg-background px-4 py-8 text-center text-[13px] text-muted-foreground">
            Every finding got a code suggestion — nothing to show with this
            filter on.
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
