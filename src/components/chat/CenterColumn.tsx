"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  ChevronDown,
  CircleAlert,
  Columns3,
  Play,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExtractionOutput } from "@/components/chat/ExtractionOutput";
import { InputEditor } from "@/components/chat/InputEditor";
import { MobileChatBar } from "@/components/chat/MobileChatBar";
import { LocalModelGate } from "@/components/models/LocalModelGate";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/client";
import { useModels } from "@/lib/hooks/useModels";
import { formatMb } from "@/lib/local/device";
import { interrupt, useLocalEngineStore } from "@/lib/local/engine";
import { runExtraction } from "@/lib/runExtraction";
import { SAMPLE_INPUTS } from "@/lib/samples";
import { useChatStore, type ChatInputType } from "@/lib/stores/chatStore";

const PLACEHOLDERS: Record<ChatInputType, string> = {
  transcript:
    "Paste a clinician–patient conversation here, or load a sample from the button above.\n\nExample:\nPatient: I've had this cough for three days...\nClinician: Any fever?\nPatient: Mild, comes and goes.",
  structured_note:
    "Paste a structured clinical note here, or load a sample from the button above.\n\n## HPI\n...\n\n## Medications\n...",
};

function LoadingTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, 100);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-[12px] text-muted-foreground">
      {elapsed.toFixed(1)}s
    </span>
  );
}

function ShimmerBar({ className }: { className?: string }) {
  return (
    <div className={cn("h-3 w-full overflow-hidden rounded bg-muted", className)}>
      <div className="h-full w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
    </div>
  );
}

function OutputEmpty({ deviceSelected }: { deviceSelected: boolean }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-10">
      <div className="flex max-w-sm flex-col items-center gap-2 text-center">
        <p className="text-[13px] text-muted-foreground">
          Structured findings will appear here. Add a transcript above — or load
          a sample — then press Run.
        </p>
        {deviceSelected ? (
          <p className="text-[12px] text-muted-foreground/80">
            This model runs in your browser: the input never leaves this device.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CloudLoading({ modelName }: { modelName: string }) {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {modelName} is extracting…
        </span>
        <LoadingTimer />
      </div>
      <div className="flex flex-col gap-3">
        <ShimmerBar />
        <ShimmerBar className="w-5/6" />
        <ShimmerBar className="w-2/3" />
        <ShimmerBar className="w-3/4" />
      </div>
    </div>
  );
}

function DevicePreparing({ modelId, modelName }: { modelId: string; modelName: string }) {
  const runtime = useLocalEngineStore((s) => s.states[modelId]);
  const progress = runtime?.progress;
  const pct =
    progress && progress.totalMb > 0
      ? Math.min(100, Math.round((progress.loadedMb / progress.totalMb) * 100))
      : null;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {runtime?.status === "downloading"
            ? `Downloading ${modelName}…`
            : `Preparing ${modelName} on this device…`}
        </span>
        <LoadingTimer />
      </div>
      {pct !== null && progress ? (
        <div className="flex flex-col gap-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-foreground/70 transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="font-mono text-[12px] text-muted-foreground">
            {formatMb(progress.loadedMb)} of {formatMb(progress.totalMb)} ({pct}%)
            — downloads once, then it&apos;s cached
          </p>
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          {runtime?.status === "downloading"
            ? "Starting download…"
            : "Loading weights into memory — this takes a few seconds the first time."}
        </p>
      )}
    </div>
  );
}

function DeviceStreaming({
  modelName,
  liveText,
  liveTps,
  onStop,
}: {
  modelName: string;
  liveText: string;
  liveTps: number | null;
  onStop: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [liveText]);

  return (
    <div className="flex h-full flex-col gap-3 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {modelName} — generating on this device
        </span>
        <div className="flex items-center gap-3">
          {liveTps ? (
            <span className="font-mono text-[12px] text-muted-foreground">
              {liveTps.toFixed(1)} tokens/s
            </span>
          ) : null}
          <Button size="sm" variant="outline" onClick={onStop}>
            <Square className="h-3 w-3" />
            Stop
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="max-h-72 flex-1 overflow-auto rounded-md border border-border bg-muted/30 p-3"
      >
        <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-foreground">
          {liveText || "…"}
          <span className="animate-pulse">▌</span>
        </pre>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Raw model output — it&apos;s parsed into structured findings when
        generation finishes. Nothing here is sent to a server.
      </p>
    </div>
  );
}

function OutputError({
  message,
  details,
  retryable,
  onRetry,
}: {
  message: string;
  details: string | null;
  retryable: boolean;
  onRetry: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 rounded-md border border-status-offline/60 bg-status-offline/5 p-4">
        <div className="flex items-center gap-2 text-status-offline">
          <CircleAlert className="h-4 w-4 shrink-0" />
          <span className="text-[13px] font-medium">
            This run didn&apos;t finish
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-foreground">{message}</p>
        <div className="flex flex-wrap items-center gap-2">
          {retryable ? (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RotateCw className="h-3.5 w-3.5" />
              Try again
            </Button>
          ) : null}
          {details ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDetails((v) => !v)}
            >
              {showDetails ? "Hide" : "Show"} technical details
            </Button>
          ) : null}
        </div>
        {showDetails && details ? (
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-background p-2 font-mono text-[11px] text-muted-foreground">
            {details}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

export function CenterColumn() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const inputContent = useChatStore((s) => s.inputContent);
  const setInputContent = useChatStore((s) => s.setInputContent);
  const inputType = useChatStore((s) => s.inputType);
  const setInputType = useChatStore((s) => s.setInputType);
  const selectedModelId = useChatStore((s) => s.selectedModelId);
  const isLoading = useChatStore((s) => s.isLoading);
  const setIsLoading = useChatStore((s) => s.setIsLoading);
  const setExtraction = useChatStore((s) => s.setExtraction);
  const extraction = useChatStore((s) => s.currentExtraction);
  const error = useChatStore((s) => s.error);
  const errorDetails = useChatStore((s) => s.errorDetails);
  const errorRetryable = useChatStore((s) => s.errorRetryable);
  const setError = useChatStore((s) => s.setError);
  const clearInput = useChatStore((s) => s.clearInput);
  const liveText = useChatStore((s) => s.liveText);
  const liveTps = useChatStore((s) => s.liveTps);
  const appendLiveText = useChatStore((s) => s.appendLiveText);
  const resetLive = useChatStore((s) => s.resetLive);

  const [gateOpen, setGateOpen] = useState(false);

  const { models } = useModels();
  const selectedModel = models.find((m) => m.id === selectedModelId);
  const isDevice = selectedModel?.runtime === "device";

  const engineState = useLocalEngineStore((s) =>
    selectedModelId ? s.states[selectedModelId] : undefined
  );
  const isDownloaded = useLocalEngineStore((s) =>
    selectedModelId ? !!s.downloaded[selectedModelId] : false
  );

  const modelUsable = !!selectedModel && selectedModel.status !== "offline";
  const canRun = modelUsable && inputContent.trim().length > 0 && !isLoading;

  const execute = async () => {
    if (!selectedModel || !inputContent.trim()) return;
    setIsLoading(true);
    setError(null);
    setExtraction(null);
    resetLive();
    try {
      const res = await runExtraction(selectedModel, inputContent, inputType, {
        onToken: appendLiveText,
      });
      setExtraction(res);
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message, e.details ?? null, e.retryable);
      } else {
        const msg = e instanceof Error ? e.message : "Something unexpected went wrong.";
        setError(msg, null, true);
      }
    } finally {
      setIsLoading(false);
      resetLive();
    }
  };

  const handleRun = () => {
    if (!canRun || !selectedModel) return;
    // First run of a not-yet-downloaded on-device model: show the spec check.
    if (isDevice && !isDownloaded && engineState?.status !== "ready") {
      setGateOpen(true);
      return;
    }
    void execute();
  };

  // Cmd/Ctrl+Enter runs from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRun, selectedModelId, inputContent, inputType, isDownloaded]);

  const loadSample = (sampleId: string) => {
    const sample = SAMPLE_INPUTS.find((s) => s.id === sampleId);
    if (!sample) return;
    setInputType(sample.inputType);
    setInputContent(sample.content);
    setExtraction(null);
    setError(null);
  };

  const placeholder = PLACEHOLDERS[inputType];
  const minHeight = inputType === "transcript" ? 220 : 320;

  const deviceBusyState =
    isDevice &&
    isLoading &&
    (engineState?.status === "downloading" || engineState?.status === "loading");
  const deviceStreaming = isDevice && isLoading && liveText.length > 0;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <MobileChatBar />
      <div className="grid min-h-0 flex-1 grid-rows-2 divide-y divide-border">
        <section className="flex min-h-0 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 pt-3 sm:px-6 sm:pt-4">
            <Tabs
              value={inputType}
              onValueChange={(v) => setInputType(v as ChatInputType)}
            >
              <TabsList>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="structured_note">Structured Note</TabsTrigger>
              </TabsList>
            </Tabs>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="mb-1 text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  Load a sample
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Example inputs
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SAMPLE_INPUTS.map((s) => (
                  <DropdownMenuItem key={s.id} onSelect={() => loadSample(s.id)}>
                    {s.label}
                    <span className="ml-auto pl-3 font-mono text-[10px] uppercase text-muted-foreground">
                      {s.inputType === "transcript" ? "transcript" : "note"}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-3 px-3 py-3 sm:px-6 sm:py-4">
              <InputEditor
                value={inputContent}
                onChange={setInputContent}
                minHeight={minHeight}
                placeholder={placeholder}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={handleRun} disabled={!canRun}>
                  <Play className="h-3.5 w-3.5" />
                  Run
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearInput}
                  disabled={!inputContent || isLoading}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    router.push(
                      selectedModelId
                        ? `/compare?model=${encodeURIComponent(selectedModelId)}`
                        : "/compare"
                    )
                  }
                  disabled={isLoading}
                >
                  <Columns3 className="h-3.5 w-3.5" />
                  Compare models
                </Button>
                <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground sm:inline">
                  ⌘↵ to run
                </span>
              </div>

              {selectedModel && !modelUsable ? (
                <p className="rounded-md border border-status-offline/40 bg-status-offline/5 px-3 py-2 text-[12px] text-foreground">
                  {selectedModel.statusDetail ??
                    `${selectedModel.name} is currently unavailable — pick another model from the list.`}
                </p>
              ) : null}
            </div>
          </ScrollArea>
        </section>

        <section className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-6">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Findings
            </span>
            <span className="flex min-w-0 items-center gap-2">
              {extraction?.runId ? (
                <span className="flex items-center gap-1 font-mono text-[11px] text-status-online">
                  <Check className="h-3 w-3" />
                  saved to history
                </span>
              ) : null}
              {selectedModel ? (
                <span className="hidden truncate font-mono text-[12px] text-muted-foreground sm:inline">
                  {selectedModel.name}
                </span>
              ) : null}
            </span>
          </div>
          <ScrollArea className="flex-1">
            {deviceStreaming && selectedModel ? (
              <DeviceStreaming
                modelName={selectedModel.name}
                liveText={liveText}
                liveTps={liveTps}
                onStop={interrupt}
              />
            ) : deviceBusyState && selectedModel ? (
              <DevicePreparing
                modelId={selectedModel.id}
                modelName={selectedModel.name}
              />
            ) : isLoading && selectedModel ? (
              <CloudLoading modelName={selectedModel.name} />
            ) : error ? (
              <OutputError
                message={error}
                details={errorDetails}
                retryable={errorRetryable}
                onRetry={() => void execute()}
              />
            ) : extraction ? (
              <div className="p-3 sm:p-6">
                <ExtractionOutput extraction={extraction} />
              </div>
            ) : (
              <OutputEmpty deviceSelected={!!isDevice} />
            )}
          </ScrollArea>
        </section>
      </div>

      <LocalModelGate
        model={selectedModel ?? null}
        open={gateOpen}
        onOpenChange={setGateOpen}
        onConfirm={() => void execute()}
      />
    </div>
  );
}
