"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Play, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { InputEditor } from "@/components/chat/InputEditor";
import { StatusDot } from "@/components/chat/shared";
import { AddModelDialog } from "@/components/compare/AddModelDialog";
import { CompareColumn } from "@/components/compare/CompareColumn";
import { CompareSummary } from "@/components/compare/CompareSummary";
import { ExportMenu, type ExportFormat } from "@/components/compare/ExportMenu";
import { cn } from "@/lib/utils";
import { extractWithModel, listModels } from "@/lib/api/client";
import {
  useChatStore,
  type ChatInputType,
} from "@/lib/stores/chatStore";
import {
  CATEGORY_LABELS,
  EXTRACTION_CATEGORIES,
  type ExtractionCategory,
} from "@/lib/constants";
import type {
  ExtractionItem,
  ExtractionResult,
  Model,
} from "@/lib/api/mocks";
import type {
  CategoryAnnotation,
  ItemAnnotation,
} from "@/components/chat/ExtractionOutput";

const PLACEHOLDERS: Record<ChatInputType, string> = {
  transcript:
    "Paste a clinician–patient transcript here.\n\nExample:\nPatient: I've had this cough for three days...\nClinician: Any fever?\nPatient: Mild, comes and goes.",
  structured_note:
    "Paste or compose a structured clinical note.\n\n## HPI\n...\n\n## ROS\n...\n\n## Medications\n...",
};

const MAX_MODELS = 3;
const MIN_MODELS = 2;
const ESTIMATED_S_PER_MODEL = 30;

function normalizeKey(item: ExtractionItem) {
  if (item.matchedCode) return `code:${item.matchedCode}`;
  return `text:${item.text.toLowerCase().trim()}`;
}

interface DiffMaps {
  itemAnnotations: Record<string, Record<string, ItemAnnotation>>; // modelId -> itemId -> annotation
  categoryAnnotations: Record<string, Partial<Record<ExtractionCategory, CategoryAnnotation>>>;
}

function buildDiffMaps(
  selectedModels: Model[],
  results: Record<string, ExtractionResult | null>
): DiffMaps {
  const itemAnnotations: DiffMaps["itemAnnotations"] = {};
  const categoryAnnotations: DiffMaps["categoryAnnotations"] = {};
  for (const m of selectedModels) {
    itemAnnotations[m.id] = {};
    categoryAnnotations[m.id] = {};
  }

  const totalModels = selectedModels.length;
  if (totalModels < 2) return { itemAnnotations, categoryAnnotations };

  // Only run diff for models that actually have results.
  const readyModels = selectedModels.filter((m) => !!results[m.id]);
  if (readyModels.length < 2) return { itemAnnotations, categoryAnnotations };

  for (const category of EXTRACTION_CATEGORIES) {
    // Per-category counts
    const perModelCounts = selectedModels.map((m) => ({
      label: m.name.split(/\s+/)[0],
      count: (results[m.id]?.results[category] ?? []).length,
    }));
    const counts = new Set(perModelCounts.map((p) => p.count));
    const countsDiffer = counts.size > 1;

    // Cross-model item presence
    const presence = new Map<string, Set<string>>(); // key -> set(modelId)
    for (const m of readyModels) {
      const items = results[m.id]?.results[category] ?? [];
      for (const item of items) {
        const key = normalizeKey(item);
        const set = presence.get(key) ?? new Set<string>();
        set.add(m.id);
        presence.set(key, set);
      }
    }

    for (const m of readyModels) {
      const items = results[m.id]?.results[category] ?? [];
      for (const item of items) {
        const key = normalizeKey(item);
        const inModels = presence.get(key) ?? new Set<string>();
        if (inModels.size < readyModels.length && inModels.size > 0) {
          const labels = readyModels
            .filter((rm) => inModels.has(rm.id))
            .map((rm) => rm.name.split(/\s+/)[0]);
          itemAnnotations[m.id][item.id] = {
            onlyInLabel: `Only in ${labels.join(", ")}`,
          };
        }
      }
      categoryAnnotations[m.id][category] = {
        highlight: countsDiffer,
        perModelCounts,
      };
    }
  }

  return { itemAnnotations, categoryAnnotations };
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

function buildMarkdown(
  inputContent: string,
  inputType: ChatInputType,
  selectedModels: Model[],
  results: Record<string, ExtractionResult | null>
): string {
  const today = format(new Date(), "yyyy-MM-dd");
  const lines: string[] = [
    `# NeoScribe comparison — ${today}`,
    "",
    `Input type: ${inputType}`,
    "",
    `## Input`,
    "",
    "```",
    inputContent || "(empty)",
    "```",
    "",
    `## Models`,
    "",
  ];
  for (const m of selectedModels) {
    lines.push(`- ${m.name} (${m.location} · ${m.sizeLabel})`);
  }
  lines.push("");

  for (const m of selectedModels) {
    const r = results[m.id];
    lines.push(`## ${m.name}`);
    if (!r) {
      lines.push("");
      lines.push("_No result._");
      lines.push("");
      continue;
    }
    const flat = EXTRACTION_CATEGORIES.flatMap(
      (c) => r.results[c] ?? []
    );
    const matched = flat.filter((i) => i.matchStatus === "matched").length;
    const elapsedS =
      (new Date(r.completedAt).getTime() -
        new Date(r.startedAt).getTime()) /
      1000;
    lines.push(
      `Processing time: ${elapsedS.toFixed(2)}s · Match rate: ${matched}/${flat.length}`
    );
    lines.push("");
    for (const category of EXTRACTION_CATEGORIES) {
      const items = r.results[category] ?? [];
      lines.push(`### ${CATEGORY_LABELS[category]} (${items.length})`);
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
  }

  return lines.join("\n");
}

function buildJson(
  inputContent: string,
  inputType: ChatInputType,
  selectedModels: Model[],
  results: Record<string, ExtractionResult | null>
) {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      inputType,
      input: inputContent,
      models: selectedModels.map((m) => ({
        id: m.id,
        name: m.name,
        location: m.location,
        sizeLabel: m.sizeLabel,
      })),
      results,
    },
    null,
    2
  );
}

function ModelChip({
  model,
  onRemove,
  removable,
}: {
  model: Model;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-3 pr-1.5">
      <StatusDot status={model.status} />
      <span className="text-[13px] text-foreground">{model.name}</span>
      <span className="rounded border border-border px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
        {model.sizeLabel}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={!removable}
        className={cn(
          "ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors",
          removable
            ? "hover:bg-muted hover:text-foreground"
            : "cursor-not-allowed opacity-40"
        )}
        aria-label={`Remove ${model.name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function ComparePage() {
  const searchParams = useSearchParams();

  const inputContent = useChatStore((s) => s.inputContent);
  const setInputContent = useChatStore((s) => s.setInputContent);
  const inputType = useChatStore((s) => s.inputType);
  const setInputType = useChatStore((s) => s.setInputType);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [results, setResults] = useState<
    Record<string, ExtractionResult | null>
  >({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [highlightDiffs, setHighlightDiffs] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const { data: modelsData } = useQuery({
    queryKey: ["models"],
    queryFn: listModels,
    refetchInterval: 15_000,
  });

  const models = useMemo(() => modelsData ?? [], [modelsData]);

  // Seed selection from URL params or sensible defaults.
  useEffect(() => {
    if (seeded || models.length === 0) return;
    const fromUrl = [
      searchParams.get("model"),
      searchParams.get("with"),
    ].filter((v): v is string => !!v && models.some((m) => m.id === v));
    if (fromUrl.length > 0) {
      setSelectedIds(Array.from(new Set(fromUrl)).slice(0, MAX_MODELS));
    } else {
      // Default to first two online models.
      const online = models.filter((m) => m.status === "online");
      setSelectedIds(online.slice(0, 2).map((m) => m.id));
    }
    setSeeded(true);
  }, [seeded, models, searchParams]);

  const selectedModels = useMemo(
    () =>
      selectedIds
        .map((id) => models.find((m) => m.id === id))
        .filter((m): m is Model => !!m),
    [selectedIds, models]
  );

  const anyLoading = Object.values(loadingMap).some(Boolean);
  const canRun =
    selectedIds.length >= MIN_MODELS &&
    inputContent.trim().length > 0 &&
    !anyLoading;

  const handleAdd = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) || prev.length >= MAX_MODELS ? prev : [...prev, id]
    );
  };

  const handleRemove = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    setResults((prev) => {
      const { [id]: _drop, ...rest } = prev;
      void _drop;
      return rest;
    });
    setLoadingMap((prev) => {
      const { [id]: _drop, ...rest } = prev;
      void _drop;
      return rest;
    });
    setErrors((prev) => {
      const { [id]: _drop, ...rest } = prev;
      void _drop;
      return rest;
    });
  };

  const runOne = async (id: string) => {
    setLoadingMap((prev) => ({ ...prev, [id]: true }));
    setErrors((prev) => ({ ...prev, [id]: null }));
    setResults((prev) => ({ ...prev, [id]: null }));
    try {
      const res = await extractWithModel(id, { transcript: inputContent });
      setResults((prev) => ({ ...prev, [id]: res }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setErrors((prev) => ({ ...prev, [id]: msg }));
    } finally {
      setLoadingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRunAll = async () => {
    if (!canRun) return;
    await Promise.all(selectedIds.map(runOne));
  };

  const diff = useMemo(
    () => buildDiffMaps(selectedModels, results),
    [selectedModels, results]
  );

  const handleExport = (formatChoice: ExportFormat) => {
    const today = format(new Date(), "yyyy-MM-dd");
    if (formatChoice === "json") {
      const json = buildJson(inputContent, inputType, selectedModels, results);
      downloadBlob(
        json,
        `neoscribe-comparison-${today}.json`,
        "application/json"
      );
      toast.success("Exported as JSON");
      return;
    }
    if (formatChoice === "markdown") {
      const md = buildMarkdown(
        inputContent,
        inputType,
        selectedModels,
        results
      );
      downloadBlob(md, `neoscribe-comparison-${today}.md`, "text/markdown");
      toast.success("Exported as Markdown");
      return;
    }
    // PDF via print dialog
    const previous = document.title;
    document.title = `neoscribe-comparison-${today}`;
    window.print();
    setTimeout(() => {
      document.title = previous;
    }, 1000);
  };

  const estimatedTotalS = ESTIMATED_S_PER_MODEL * selectedIds.length;
  const exportDisabled = selectedModels.length === 0;
  const completedCount = selectedModels.filter((m) => !!results[m.id]).length;

  return (
    <PageContainer
      title="Compare"
      description="Run the same input across multiple models and see the differences side-by-side."
      actions={
        <ExportMenu disabled={exportDisabled} onExport={handleExport} />
      }
    >
      <div className="flex flex-col gap-6">
        {/* Model selection */}
        <section className="flex flex-col gap-3 print:hidden">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Models to compare
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {selectedModels.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                No models selected.
              </p>
            ) : (
              selectedModels.map((m) => (
                <ModelChip
                  key={m.id}
                  model={m}
                  removable={selectedIds.length > 0}
                  onRemove={() => handleRemove(m.id)}
                />
              ))
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddOpen(true)}
              disabled={selectedIds.length >= MAX_MODELS}
            >
              <Plus className="h-3.5 w-3.5" />
              Add model
            </Button>
          </div>
          {selectedIds.length < MIN_MODELS ? (
            <p className="text-[12px] text-muted-foreground">
              Select at least {MIN_MODELS} models to enable Run.
            </p>
          ) : null}
        </section>

        {/* Shared input */}
        <section className="flex flex-col gap-3 print:hidden">
          <Tabs
            value={inputType}
            onValueChange={(v) => setInputType(v as ChatInputType)}
          >
            <TabsList>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="structured_note">Structured Note</TabsTrigger>
            </TabsList>
          </Tabs>
          <InputEditor
            value={inputContent}
            onChange={setInputContent}
            minHeight={inputType === "transcript" ? 200 : 280}
            placeholder={PLACEHOLDERS[inputType]}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={handleRunAll} disabled={!canRun}>
              <Play className="h-3.5 w-3.5" />
              Run on all models
            </Button>
            <span className="font-mono text-[12px] text-muted-foreground">
              {selectedIds.length === 0
                ? "Add models to enable Run."
                : `Will run on ${selectedIds.length} model${selectedIds.length === 1 ? "" : "s"} (~${estimatedTotalS}s)`}
            </span>
            <div className="ml-auto flex items-center gap-2 rounded-md border border-border px-3 py-1">
              <Switch
                id="highlight-diffs"
                checked={highlightDiffs}
                onCheckedChange={setHighlightDiffs}
              />
              <Label
                htmlFor="highlight-diffs"
                className="cursor-pointer text-[13px] text-foreground"
              >
                Highlight differences
              </Label>
              {highlightDiffs ? (
                <Sparkles className="h-3.5 w-3.5 text-foreground" />
              ) : null}
            </div>
          </div>
        </section>

        {/* Print-only header for PDF export */}
        <section className="hidden print:flex print-stack flex-col gap-3">
          <h2 className="text-[18px] font-semibold">NeoScribe comparison</h2>
          <p className="text-[12px] text-muted-foreground">
            Input ({inputType}):
          </p>
          <pre className="whitespace-pre-wrap rounded border border-border bg-background p-3 font-mono text-[11px]">
            {inputContent || "(empty)"}
          </pre>
        </section>

        {/* Results grid */}
        {selectedModels.length < MIN_MODELS ? (
          <div className="rounded-md border border-border bg-background px-4 py-8 text-center text-[13px] text-muted-foreground print:hidden">
            Add at least {MIN_MODELS} models to start a comparison.
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-4",
              selectedModels.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"
            )}
          >
            {selectedModels.map((m) => (
              <CompareColumn
                key={m.id}
                model={m}
                extraction={results[m.id] ?? null}
                loading={!!loadingMap[m.id]}
                error={errors[m.id] ?? null}
                onRetry={() => runOne(m.id)}
                highlightDiffs={highlightDiffs}
                itemAnnotations={diff.itemAnnotations[m.id]}
                categoryAnnotations={diff.categoryAnnotations[m.id]}
              />
            ))}
          </div>
        )}

        {/* Summary */}
        {selectedModels.length >= MIN_MODELS ? (
          <CompareSummary models={selectedModels} results={results} />
        ) : null}

        {completedCount > 0 && completedCount < selectedModels.length ? (
          <p className="text-[12px] text-muted-foreground print:hidden">
            {completedCount} of {selectedModels.length} models complete.
          </p>
        ) : null}
      </div>

      <AddModelDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        models={models}
        excludeIds={selectedIds}
        onAdd={handleAdd}
      />
    </PageContainer>
  );
}
