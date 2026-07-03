"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { ModelCard } from "@/components/models/ModelCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useModels } from "@/lib/hooks/useModels";
import type { Model, ModelRuntime } from "@/lib/api/types";

type RuntimeFilter = "all" | ModelRuntime;

const RUNTIME_FILTERS: { value: RuntimeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "cloud", label: "Cloud" },
  { value: "device", label: "On-device" },
];

function ModelCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-10 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="my-1 h-px w-full bg-border" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="flex gap-2 pt-2">
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function filterModels(
  models: Model[],
  runtime: RuntimeFilter,
  query: string
): Model[] {
  const q = query.trim().toLowerCase();
  return models.filter((m) => {
    if (runtime !== "all" && m.runtime !== runtime) return false;
    if (
      q &&
      !m.name.toLowerCase().includes(q) &&
      !m.provider.toLowerCase().includes(q) &&
      !m.id.toLowerCase().includes(q)
    )
      return false;
    return true;
  });
}

function ModelsPageContent() {
  const searchParams = useSearchParams();
  const initialRuntime = searchParams.get("runtime");
  const [runtime, setRuntime] = useState<RuntimeFilter>(
    initialRuntime === "device" || initialRuntime === "cloud"
      ? initialRuntime
      : "all"
  );
  const [query, setQuery] = useState("");

  const { models, isLoading, cloudError } = useModels();

  const visible = useMemo(
    () => filterModels(models, runtime, query),
    [models, runtime, query]
  );

  const resetFilters = () => {
    setRuntime("all");
    setQuery("");
  };

  return (
    <PageContainer
      title="Models"
      description="Cloud models run on hosted GPUs. On-device models download once and run inside your browser — private by design."
    >
      <div className="sticky top-0 z-10 -mx-4 -mt-5 mb-6 border-b border-border bg-background px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          {/* Styled to match the shadcn Tabs used on Scribe/Chat/Compare. */}
          <div className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
            {RUNTIME_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setRuntime(f.value)}
                className={cn(
                  "h-7 rounded-sm px-2.5 text-[13px] font-medium transition-colors",
                  runtime === f.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative ml-auto w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or provider…"
              className="h-9 pl-8"
            />
          </div>

          <span className="hidden font-mono text-[12px] text-muted-foreground sm:inline">
            {visible.length} of {models.length} models
          </span>
        </div>
      </div>

      {cloudError && runtime !== "device" ? (
        <div className="mb-4 rounded-lg border border-status-loading/40 bg-status-loading/5 px-4 py-3 text-[13px] text-foreground">
          The cloud model catalog couldn&apos;t be reached, so only on-device
          models are listed. They work fully offline once downloaded.
        </div>
      ) : null}

      {isLoading && models.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ModelCardSkeleton key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-border bg-background p-8 text-center">
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

export default function ModelsPage() {
  return (
    <Suspense fallback={null}>
      <ModelsPageContent />
    </Suspense>
  );
}
