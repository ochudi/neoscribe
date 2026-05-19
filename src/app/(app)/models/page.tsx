"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { ModelCard } from "@/components/models/ModelCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { listModels } from "@/lib/api/client";
import type { Model } from "@/lib/api/mocks";

type LocationFilter = "all" | "cloud" | "edge";

const LOCATION_FILTERS: { value: LocationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "cloud", label: "Cloud" },
  { value: "edge", label: "Edge" },
];

function ModelCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-10 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="my-1 h-px w-full bg-border" />
      <div className="flex gap-2">
        <div className="h-5 w-14 animate-pulse rounded bg-muted" />
        <div className="h-5 w-14 animate-pulse rounded bg-muted" />
        <div className="h-5 w-14 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="flex gap-2 pt-2">
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function PageActions() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button variant="ghost" size="sm" disabled className="gap-1.5">
              <Plus className="h-4 w-4" />
              Register new model
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">Coming in v2</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function filterModels(
  models: Model[],
  location: LocationFilter,
  onlineOnly: boolean,
  query: string
): Model[] {
  const q = query.trim().toLowerCase();
  return models.filter((m) => {
    if (location !== "all" && m.location !== location) return false;
    if (onlineOnly && m.status !== "online") return false;
    if (q && !m.name.toLowerCase().includes(q) && !m.id.toLowerCase().includes(q))
      return false;
    return true;
  });
}

export default function ModelsPage() {
  const [location, setLocation] = useState<LocationFilter>("all");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["models"],
    queryFn: listModels,
    refetchInterval: 15_000,
  });

  const models = useMemo(() => data ?? [], [data]);
  const visible = useMemo(
    () => filterModels(models, location, onlineOnly, query),
    [models, location, onlineOnly, query]
  );

  const resetFilters = () => {
    setLocation("all");
    setOnlineOnly(false);
    setQuery("");
  };

  return (
    <PageContainer
      title="Models"
      description="All AI models registered with the NeoScribe gateway. Status updates every 15 seconds."
      actions={<PageActions />}
    >
      <div className="sticky top-0 z-10 -mx-8 -mt-6 mb-6 border-b border-border bg-background px-8 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            {LOCATION_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setLocation(f.value)}
                className={cn(
                  "h-7 rounded px-2.5 text-[13px] transition-colors",
                  location === f.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1">
            <Switch
              id="online-only"
              checked={onlineOnly}
              onCheckedChange={setOnlineOnly}
            />
            <Label
              htmlFor="online-only"
              className="cursor-pointer text-[13px] text-foreground"
            >
              Online only
            </Label>
          </div>

          <div className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name..."
              className="h-9 pl-8"
            />
          </div>

          <span className="font-mono text-[12px] text-muted-foreground">
            Showing {visible.length} of {models.length} models
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ModelCardSkeleton key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-md border border-border bg-background p-8 text-center">
            <p className="text-[14px] text-foreground">
              No models match this filter.
            </p>
            <Button size="sm" variant="outline" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visible.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
