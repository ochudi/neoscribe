"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
import { LocalModelGate } from "@/components/models/LocalModelGate";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/client";
import { useModels } from "@/lib/hooks/useModels";
import { useLocalEngineStore } from "@/lib/local/engine";
import { runExtraction } from "@/lib/runExtraction";
import { SAMPLE_INPUTS } from "@/lib/samples";
import { useChatStore, type ChatInputType } from "@/lib/stores/chatStore";
import {
  CATEGORY_LABELS,
  EXTRACTION_CATEGORIES,
  type ExtractionCategory,
} from "@/lib/constants";
import type {
  ExtractionItem,
  ExtractionResult,
  Model,
} from "@/lib/api/types";
import type {
  CategoryAnnotation,
  ItemAnnotation,
} from "@/components/chat/ExtractionOutput";

const PLACEHOLDERS: Record<ChatInputType, string> = {
  transcript:
    "Paste a clinician–patient conversation here, or load a sample.\n\nExample:\nPatient: I've had this cough for three days...\nClinician: Any fever?",
  structured_note:
    "Paste a structured clinical note here, or load a sample.\n\n## HPI\n...\n\n## Medications\n...",
};

const MAX_MODELS = 3;
const MIN_MODELS = 2;

interface RunError {
  message: string;
  details?: string | null;
}

function normalizeKey(item: ExtractionItem) {
  if (item.matchedCode) return `code:${item.matchedCode}`;
  return `text:${item.text.toLowerCase().trim()}`;
}

interface DiffMaps {
  itemAnnotations: Record<string, Record<string, ItemAnnotation>>;
  categoryAnnotations: Record<
    string,
    Partial<Record<ExtractionCategory, CategoryAnnotation>>
  >;
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

  const readyModels = selectedModels.filter((m) => !!results[m.id]);
  if (readyModels.length < 2) return { itemAnnotations, categoryAnnotations };

  for (const category of EXTRACTION_CATEGORIES) {
    const perModelCounts = selectedModels.map((m) => ({
      label: m.name.split(/\s+/)[0],
      count: (results[m.id]?.results[category] ?? []).length,
    }));
    const counts = new Set(perModelCounts.map((p) => p.count));
    const countsDiffer = counts.size > 1;

    const presence = new Map<string, Set<string>>();
    for (const m of readyModels) {
      for (const item of results[m.id]?.results[category] ?? []) {
        const key = normalizeKey(item);
        const set = presence.get(key) ?? new Set<string>();
        set.add(m.id);
        presence.set(key, set);
      }
    }

    for (const m of readyModels) {
      for (const item of results[m.id]?.results[category] ?? []) {
        const inModels = presence.get(normalizeKey(item)) ?? new Set<string>();
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
    lines.push(`- ${m.name} (${m.runtime} · ${m.sizeLabel})`);
  }
  lines.push("");

  for (const m of selectedModels) {
    const r = results[m.id];
    lines.push(`## ${m.name}`);
    if (!r) {
      lines.push("", "_No result._", "");
      continue;
    }
    const flat = EXTRACTION_CATEGORIES.flatMap((c) => r.results[c] ?? []);
    const coded = flat.filter((i) => i.matchStatus === "matched").length;
    const elapsedS =
      (new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) /
      1000;
    lines.push(
      `Processing time: ${elapsedS.toFixed(2)}s · Coded: ${coded}/${flat.length}`
    );
    lines.push("");
    for (const category of EXTRACTION_CATEGORIES) {
      const items = r.results[category] ?? [];
      lines.push(`### ${CATEGORY_LABELS[category]} (${items.length})`);
      if (items.length === 0) {
        lines.push("_No items extracted._");
      } else {
        for (const item of items) {
          const code = item.matchedCode ? ` (${item.matchedCode})` : "";
          lines.push(`- ${item.text}${code}`);
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
        runtime: m.runtime,
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
}: {
  model: Model;
  onRemove: () => void;
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
        className="-my-1 ml-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Remove ${model.name}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ComparePageContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const inputContent = useChatStore((s) => s.inputContent);
  const setInputContent = useChatStore((s) => s.setInputContent);
  const inputType = useChatStore((s) => s.inputType);
  const setInputType = useChatStore((s) => s.setInputType);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, ExtractionResult | null>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, RunError | null>>({});
  const [highlightDiffs, setHighlightDiffs] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Spec-check queue for on-device models that still need a download.
  const [gateQueue, setGateQueue] = useState<Model[]>([]);
  const gateConfirmed = useRef(false);
  const pendingRunRef = useRef(false);

  const { models, isLoading: modelsLoading } = useModels();
  const downloadedMap = useLocalEngineStore((s) => s.downloaded);

  // Seed selection from URL params or sensible defaults — but not before the
  // cloud catalog has loaded, or we'd "default" to nothing.
  useEffect(() => {
    if (seeded || models.length === 0 || modelsLoading) return;
    const fromUrl = [searchParams.get("model"), searchParams.get("with")].filter(
      (v): v is string => !!v && models.some((m) => m.id === v)
    );
    if (fromUrl.length > 0) {
      const seedIds = Array.from(new Set(fromUrl));
      // Pair a lone model with the first online cloud model that isn't it.
      if (seedIds.length < MIN_MODELS) {
        const partner = models.find(
          (m) =>
            m.runtime === "cloud" &&
            m.status === "online" &&
            !seedIds.includes(m.id)
        );
        if (partner) seedIds.push(partner.id);
      }
      setSelectedIds(seedIds.slice(0, MAX_MODELS));
    } else {
      // Prefer online cloud models; fall back to anything usable (e.g.
      // on-device models) so the page never opens with an empty selection.
      const online = models.filter(
        (m) => m.runtime === "cloud" && m.status === "online"
      );
      const usable = models.filter(
        (m) => m.status !== "offline" && !online.includes(m)
      );
      setSelectedIds([...online, ...usable].slice(0, 2).map((m) => m.id));
    }
    setSeeded(true);
  }, [seeded, models, modelsLoading, searchParams]);

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
    const drop = <T,>(map: Record<string, T>) => {
      const rest = { ...map };
      delete rest[id];
      return rest;
    };
    setResults(drop);
    setLoadingMap(drop);
    setErrors(drop);
  };

  const runOne = async (model: Model) => {
    setLoadingMap((prev) => ({ ...prev, [model.id]: true }));
    setErrors((prev) => ({ ...prev, [model.id]: null }));
    setResults((prev) => ({ ...prev, [model.id]: null }));
    try {
      const res = await runExtraction(model, inputContent, inputType);
      setResults((prev) => ({ ...prev, [model.id]: res }));
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (e) {
      const err: RunError =
        e instanceof ApiError
          ? { message: e.message, details: e.details }
          : { message: e instanceof Error ? e.message : "Unknown error" };
      setErrors((prev) => ({ ...prev, [model.id]: err }));
    } finally {
      setLoadingMap((prev) => ({ ...prev, [model.id]: false }));
    }
  };

  const startAll = async () => {
    const cloud = selectedModels.filter((m) => m.runtime === "cloud");
    const device = selectedModels.filter((m) => m.runtime === "device");
    // Mark everything as loading immediately so queued device models show
    // their "waiting" state instead of looking idle.
    setLoadingMap((prev) => {
      const next = { ...prev };
      for (const m of selectedModels) next[m.id] = true;
      return next;
    });
    await Promise.all([
      Promise.all(cloud.map((m) => runOne(m))),
      (async () => {
        // On-device models share the same hardware — run one at a time.
        for (const m of device) await runOne(m);
      })(),
    ]);
  };

  const handleRunAll = () => {
    if (!canRun) return;
    const needDownload = selectedModels.filter(
      (m) => m.runtime === "device" && !downloadedMap[m.id]
    );
    if (needDownload.length > 0) {
      pendingRunRef.current = true;
      setGateQueue(needDownload);
      return;
    }
    void startAll();
  };

  const handleRetry = (model: Model) => {
    if (model.runtime === "device" && !downloadedMap[model.id]) {
      pendingRunRef.current = false;
      setGateQueue([model]);
      return;
    }
    void runOne(model);
  };

  const handleGateChange = (open: boolean) => {
    if (open) return;
    if (gateConfirmed.current) {
      gateConfirmed.current = false;
      setGateQueue((q) => {
        const rest = q.slice(1);
        if (rest.length === 0) {
          if (pendingRunRef.current) {
            pendingRunRef.current = false;
            void startAll();
          }
        }
        return rest;
      });
    } else {
      // User backed out — cancel the whole run.
      pendingRunRef.current = false;
      setGateQueue([]);
    }
  };

  const diff = useMemo(
    () => buildDiffMaps(selectedModels, results),
    [selectedModels, results]
  );

  const handleExport = (formatChoice: ExportFormat) => {
    const today = format(new Date(), "yyyy-MM-dd");
    if (formatChoice === "json") {
      downloadBlob(
        buildJson(inputContent, inputType, selectedModels, results),
        `neoscribe-comparison-${today}.json`,
        "application/json"
      );
      toast.success("Exported as JSON");
      return;
    }
    if (formatChoice === "markdown") {
      downloadBlob(
        buildMarkdown(inputContent, inputType, selectedModels, results),
        `neoscribe-comparison-${today}.md`,
        "text/markdown"
      );
      toast.success("Exported as Markdown");
      return;
    }
    const previous = document.title;
    document.title = `neoscribe-comparison-${today}`;
    window.print();
    setTimeout(() => {
      document.title = previous;
    }, 1000);
  };

  const cloudEstimate = selectedModels
    .filter((m) => m.runtime === "cloud")
    .reduce((s, m) => s + (m.typicalLatencyS ?? 5), 0);
  const deviceCount = selectedModels.filter((m) => m.runtime === "device").length;
  const completedCount = selectedModels.filter((m) => !!results[m.id]).length;
  const exportDisabled = completedCount === 0;

  const runHint =
    selectedIds.length < MIN_MODELS
      ? `Pick at least ${MIN_MODELS} models to compare.`
      : `${selectedIds.length} models` +
        (cloudEstimate > 0 ? ` · cloud ≈${Math.max(5, Math.round(cloudEstimate * 1.2))}s` : "") +
        (deviceCount > 0 ? ` · ${deviceCount} on-device (one at a time)` : "");

  return (
    <PageContainer
      title="Compare"
      description="Same input, several models — see what each catches and misses."
      actions={<ExportMenu disabled={exportDisabled} onExport={handleExport} />}
    >
      <div className="flex flex-col gap-6">
        {/* Model selection */}
        <section className="flex flex-col gap-3 print:hidden">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Models to compare ({selectedIds.length}/{MAX_MODELS})
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {selectedModels.map((m) => (
              <ModelChip key={m.id} model={m} onRemove={() => handleRemove(m.id)} />
            ))}
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
        </section>

        {/* Shared input */}
        <section className="flex flex-col gap-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs
              value={inputType}
              onValueChange={(v) => setInputType(v as ChatInputType)}
            >
              <TabsList>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="structured_note">Structured Note</TabsTrigger>
              </TabsList>
            </Tabs>
            {!inputContent.trim() ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => {
                  const sample = SAMPLE_INPUTS[0];
                  setInputType(sample.inputType);
                  setInputContent(sample.content);
                }}
              >
                Load a sample
              </Button>
            ) : null}
          </div>
          <InputEditor
            value={inputContent}
            onChange={setInputContent}
            minHeight={inputType === "transcript" ? 180 : 260}
            placeholder={PLACEHOLDERS[inputType]}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              onClick={handleRunAll}
              disabled={!canRun}
              className="h-11 px-5 sm:h-9 sm:px-3"
            >
              <Play className="h-3.5 w-3.5" />
              Run on all models
            </Button>
            <span className="font-mono text-[12px] text-muted-foreground">
              {runHint}
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
          <p className="text-[12px] text-muted-foreground">Input ({inputType}):</p>
          <pre className="whitespace-pre-wrap rounded border border-border bg-background p-3 font-mono text-[11px]">
            {inputContent || "(empty)"}
          </pre>
        </section>

        {/* Results grid */}
        {selectedModels.length < MIN_MODELS ? (
          <div className="rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center text-[13px] text-muted-foreground print:hidden">
            Add at least {MIN_MODELS} models to start a comparison.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Below lg the columns stay side-by-side in a scroll-snap strip —
                comparing stacked columns defeats the point of the page. */}
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground lg:hidden print:hidden">
              {selectedModels.length} columns — swipe sideways
            </p>
            <div
              className={cn(
                "grid snap-x snap-mandatory grid-flow-col gap-4 overflow-x-auto pb-2",
                "auto-cols-[minmax(0,88%)] sm:auto-cols-[minmax(0,58%)]",
                "lg:snap-none lg:grid-flow-row lg:auto-cols-auto lg:overflow-x-visible lg:pb-0",
                "print:grid-flow-row print:grid-cols-1 print:overflow-visible print:pb-0",
                selectedModels.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"
              )}
            >
              {selectedModels.map((m) => (
                <CompareColumn
                  key={m.id}
                  model={m}
                  extraction={results[m.id] ?? null}
                  loading={!!loadingMap[m.id]}
                  error={errors[m.id]?.message ?? null}
                  errorDetails={errors[m.id]?.details}
                  onRetry={() => handleRetry(m)}
                  highlightDiffs={highlightDiffs}
                  itemAnnotations={diff.itemAnnotations[m.id]}
                  categoryAnnotations={diff.categoryAnnotations[m.id]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {selectedModels.length >= MIN_MODELS ? (
          <CompareSummary models={selectedModels} results={results} />
        ) : null}
      </div>

      <AddModelDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        models={models}
        excludeIds={selectedIds}
        onAdd={handleAdd}
      />

      <LocalModelGate
        model={gateQueue[0] ?? null}
        open={gateQueue.length > 0}
        onOpenChange={handleGateChange}
        onConfirm={() => {
          gateConfirmed.current = true;
        }}
      />
    </PageContainer>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <ComparePageContent />
    </Suspense>
  );
}
