"use client";

import { ChevronDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface HistoryFilters {
  search: string;
  modelIds: string[];
  dateFrom: string; // YYYY-MM-DD or ""
  dateTo: string;
  minRate: number; // 0..100 — share of findings with a code
  maxRate: number;
}

export const DEFAULT_FILTERS: HistoryFilters = {
  search: "",
  modelIds: [],
  dateFrom: "",
  dateTo: "",
  minRate: 0,
  maxRate: 100,
};

export function filtersAreDefault(f: HistoryFilters) {
  return (
    f.search === "" &&
    f.modelIds.length === 0 &&
    f.dateFrom === "" &&
    f.dateTo === "" &&
    f.minRate === 0 &&
    f.maxRate === 100
  );
}

interface FiltersBarProps {
  filters: HistoryFilters;
  onChange: (next: HistoryFilters) => void;
  modelOptions: Array<{ id: string; name: string }>;
}

export function FiltersBar({ filters, onChange, modelOptions }: FiltersBarProps) {
  const update = (patch: Partial<HistoryFilters>) =>
    onChange({ ...filters, ...patch });

  const toggleModel = (id: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...filters.modelIds, id]))
      : filters.modelIds.filter((x) => x !== id);
    update({ modelIds: next });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search input text…"
            className="h-11 pl-8 sm:h-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-11 gap-1.5 sm:h-9">
              Models ({filters.modelIds.length === 0 ? "All" : filters.modelIds.length})
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Filter by model
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {modelOptions.length === 0 ? (
              <div className="px-2 py-2 text-[12px] text-muted-foreground">
                No models in history yet.
              </div>
            ) : (
              modelOptions.map((m) => (
                <DropdownMenuCheckboxItem
                  key={m.id}
                  checked={filters.modelIds.includes(m.id)}
                  onCheckedChange={(checked) => toggleModel(m.id, !!checked)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {m.name}
                </DropdownMenuCheckboxItem>
              ))
            )}
            {filters.modelIds.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                <button
                  type="button"
                  onClick={() => update({ modelIds: [] })}
                  className="w-full px-2 py-1.5 text-left text-[12px] text-muted-foreground hover:text-foreground"
                >
                  Clear model filter
                </button>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 sm:flex sm:w-auto">
          <Label
            htmlFor="date-from"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            From
          </Label>
          <Input
            id="date-from"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => update({ dateFrom: e.target.value })}
            className="h-11 w-full sm:h-9 sm:w-[140px]"
          />
          <Label
            htmlFor="date-to"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            To
          </Label>
          <Input
            id="date-to"
            type="date"
            value={filters.dateTo}
            onChange={(e) => update({ dateTo: e.target.value })}
            className="h-11 w-full sm:h-9 sm:w-[140px]"
          />
        </div>

        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          disabled={filtersAreDefault(filters)}
          className={cn(
            "ml-auto min-h-11 text-[12px] underline-offset-2 hover:underline sm:min-h-0",
            filtersAreDefault(filters)
              ? "cursor-not-allowed text-muted-foreground/60"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Clear filters
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex w-full max-w-md flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px]">
            <span className="font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Share of findings with a code
            </span>
            <span className="font-mono text-muted-foreground">
              {filters.minRate}% – {filters.maxRate}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.minRate}
              onChange={(e) => {
                const v = Number(e.target.value);
                update({ minRate: v, maxRate: Math.max(v, filters.maxRate) });
              }}
              aria-label="Minimum coded share"
              className="h-6 w-full cursor-pointer accent-foreground sm:h-4"
            />
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.maxRate}
              onChange={(e) => {
                const v = Number(e.target.value);
                update({ maxRate: v, minRate: Math.min(v, filters.minRate) });
              }}
              aria-label="Maximum coded share"
              className="h-6 w-full cursor-pointer accent-foreground sm:h-4"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
