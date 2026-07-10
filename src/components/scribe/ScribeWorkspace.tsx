"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  FileText,
  Loader2,
  RotateCw,
  Save,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputEditor } from "@/components/chat/InputEditor";
import { LocalModelGate } from "@/components/models/LocalModelGate";
import { ModelPicker } from "@/components/scribe/ModelPicker";
import { RecorderPanel } from "@/components/scribe/RecorderPanel";
import { NoteDocument } from "@/components/scribe/NoteDocument";
import { NoteExportMenu } from "@/components/scribe/NoteExportMenu";
import { cn } from "@/lib/utils";
import { ApiError, saveNote } from "@/lib/api/client";
import { useModels } from "@/lib/hooks/useModels";
import { formatMb } from "@/lib/local/device";
import { interrupt, useLocalEngineStore } from "@/lib/local/engine";
import { generateNote } from "@/lib/notes/generateNote";
import { noteToPlainText } from "@/lib/notes/render";
import { SAMPLE_INPUTS } from "@/lib/samples";
import { useScribeStore } from "@/lib/stores/scribeStore";
import type { RunInputType } from "@/lib/api/types";

const PLACEHOLDER =
  "Paste a clinician–patient conversation or a rough note here, or load a sample above.\n\nExample:\nPatient: I've had this cough for about three days, bringing up green phlegm.\nClinician: Any fever? O/E your chest has scattered wheezes…";

/** Panels own the viewport on desktop — header + page chrome is ~15rem. */
const PANEL_MIN_H = "lg:min-h-[calc(100dvh-15rem)]";

function LoadingTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 100);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
      {elapsed.toFixed(1)}s
    </span>
  );
}

/** Status dot with an expanding ring — the "this instrument is live" signal. */
function LiveDot({ className }: { className?: string }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
      <span
        className={cn(
          "absolute inset-0 rounded-full motion-safe:animate-pulse-ring",
          className
        )}
      />
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", className)} />
    </span>
  );
}

function ShimmerBar({ className }: { className?: string }) {
  return (
    <div className={cn("h-3 w-full overflow-hidden rounded bg-muted", className)}>
      <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-foreground/10 to-transparent motion-safe:animate-shimmer" />
    </div>
  );
}

function CloudLoading({ modelName }: { modelName: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <LiveDot className="bg-status-loading" />
          {modelName} is writing the note…
        </span>
        <LoadingTimer />
      </div>
      {/* Skeleton shaped like the document it becomes. */}
      <div className="flex flex-col gap-5 rounded-md border border-border bg-card p-5 sm:p-6">
        <ShimmerBar className="h-4 w-1/3" />
        <div className="flex flex-col gap-2.5">
          <ShimmerBar />
          <ShimmerBar className="w-5/6" />
          <ShimmerBar className="w-2/3" />
        </div>
        <ShimmerBar className="h-4 w-1/4" />
        <div className="flex flex-col gap-2.5">
          <ShimmerBar className="w-3/4" />
          <ShimmerBar className="w-1/2" />
        </div>
      </div>
    </div>
  );
}

function DevicePreparing({
  modelId,
  modelName,
}: {
  modelId: string;
  modelName: string;
}) {
  const runtime = useLocalEngineStore((s) => s.states[modelId]);
  const progress = runtime?.progress;
  const pct =
    progress && progress.totalMb > 0
      ? Math.min(100, Math.round((progress.loadedMb / progress.totalMb) * 100))
      : null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <LiveDot className="bg-status-loading" />
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
          <p className="font-mono text-[12px] tabular-nums text-muted-foreground">
            {formatMb(progress.loadedMb)} of {formatMb(progress.totalMb)} ({pct}%)
            — downloads once, then it&apos;s cached
          </p>
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          Loading weights into memory — this takes a few seconds the first time.
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
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <LiveDot className="bg-status-loading" />
          {modelName} — writing on this device
        </span>
        <div className="flex items-center gap-3">
          {liveTps ? (
            <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
              {liveTps.toFixed(1)} tok/s
            </span>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={onStop}
            className="h-11 sm:h-8"
          >
            <Square className="h-3 w-3" />
            Stop
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="max-h-80 min-h-40 flex-1 overflow-auto rounded-md border border-border bg-muted/30 p-3 lg:max-h-none"
      >
        <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-foreground">
          {liveText || "…"}
          <span
            aria-hidden="true"
            className="ml-px inline-block h-[13px] w-[7px] translate-y-[2px] bg-foreground/80 motion-safe:animate-caret"
          />
        </pre>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Raw model output — it&apos;s formatted into the note when generation
        finishes. Nothing here is sent to a server.
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
    <div className="flex flex-col gap-3 rounded-md border border-status-offline/60 bg-status-offline/5 p-4">
      <div className="flex items-center gap-2 text-status-offline">
        <CircleAlert className="h-4 w-4 shrink-0" />
        <span className="text-[13px] font-medium">
          This note didn&apos;t finish
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-foreground">{message}</p>
      <div className="flex flex-wrap items-center gap-2">
        {retryable ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="h-11 sm:h-9"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        ) : null}
        {details ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDetails((v) => !v)}
            className="h-11 sm:h-9"
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
  );
}

function NotePanelEmpty({ deviceSelected }: { deviceSelected: boolean }) {
  return (
    <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-4 text-center">
      <FileText className="h-8 w-8 text-muted-foreground/50" />
      {/* Idle trace — the instrument is on, waiting for input. */}
      <div
        className="relative h-px w-44 overflow-hidden bg-border"
        aria-hidden="true"
      >
        <span className="absolute top-0 h-px w-12 bg-status-online/70 motion-safe:animate-sweep" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="max-w-sm text-[13px] text-muted-foreground">
          A structured clinical note will appear here. Paste a transcript, pick
          a model, then press Generate.
        </p>
        {deviceSelected ? (
          <p className="text-[12px] text-muted-foreground/80">
            This model runs in your browser — the transcript never leaves this
            device.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ScribeWorkspace({ initialModelId }: { initialModelId?: string }) {
  const transcript = useScribeStore((s) => s.transcript);
  const setTranscript = useScribeStore((s) => s.setTranscript);
  const inputType = useScribeStore((s) => s.inputType);
  const setInputType = useScribeStore((s) => s.setInputType);
  const selectedModelId = useScribeStore((s) => s.selectedModelId);
  const setSelectedModelId = useScribeStore((s) => s.setSelectedModelId);
  const note = useScribeStore((s) => s.note);
  const setNote = useScribeStore((s) => s.setNote);
  const isLoading = useScribeStore((s) => s.isLoading);
  const setIsLoading = useScribeStore((s) => s.setIsLoading);
  const error = useScribeStore((s) => s.error);
  const errorDetails = useScribeStore((s) => s.errorDetails);
  const errorRetryable = useScribeStore((s) => s.errorRetryable);
  const setError = useScribeStore((s) => s.setError);
  const clearTranscript = useScribeStore((s) => s.clearTranscript);
  const liveText = useScribeStore((s) => s.liveText);
  const liveTps = useScribeStore((s) => s.liveTps);
  const appendLiveText = useScribeStore((s) => s.appendLiveText);
  const resetLive = useScribeStore((s) => s.resetLive);

  const [gateOpen, setGateOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [source, setSource] = useState<"recorded" | "pasted">("pasted");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { models } = useModels();
  const selectedModel = models.find((m) => m.id === selectedModelId);
  const isDevice = selectedModel?.runtime === "device";

  // Seed the model from a `?model=` link or default to the first ready model.
  useEffect(() => {
    if (selectedModelId || models.length === 0) return;
    if (initialModelId && models.some((m) => m.id === initialModelId)) {
      setSelectedModelId(initialModelId);
      return;
    }
    const firstReady = models.find((m) => m.status !== "offline");
    if (firstReady) setSelectedModelId(firstReady.id);
  }, [initialModelId, models, selectedModelId, setSelectedModelId]);

  const engineState = useLocalEngineStore((s) =>
    selectedModelId ? s.states[selectedModelId] : undefined
  );
  const isDownloaded = useLocalEngineStore((s) =>
    selectedModelId ? !!s.downloaded[selectedModelId] : false
  );

  const modelUsable = !!selectedModel && selectedModel.status !== "offline";
  const canGenerate = modelUsable && transcript.trim().length > 0 && !isLoading;

  const execute = async () => {
    if (!selectedModel || !transcript.trim()) return;
    setIsLoading(true);
    setError(null);
    setNote(null);
    setSavedId(null);
    resetLive();
    try {
      const res = await generateNote(selectedModel, transcript, inputType, {
        onToken: appendLiveText,
      });
      setNote(res);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message, e.details ?? null, e.retryable);
      } else {
        const msg =
          e instanceof Error ? e.message : "Something unexpected went wrong.";
        setError(msg, null, true);
      }
    } finally {
      setIsLoading(false);
      resetLive();
    }
  };

  const handleGenerate = () => {
    if (!canGenerate || !selectedModel) return;
    if (isDevice && !isDownloaded && engineState?.status !== "ready") {
      setGateOpen(true);
      return;
    }
    void execute();
  };

  // Cmd/Ctrl+Enter generates from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerate, selectedModelId, transcript, inputType, isDownloaded]);

  const loadSample = (sampleId: string) => {
    const sample = SAMPLE_INPUTS.find((s) => s.id === sampleId);
    if (!sample) return;
    setInputType(sample.inputType);
    setTranscript(sample.content);
    setSource("pasted");
    setNote(null);
    setError(null);
  };

  const handleRecordedTranscript = (text: string) => {
    setInputType("transcript");
    setNote(null);
    setError(null);
    setSource("recorded");
    const existing = transcript.trim();
    setTranscript(existing ? `${existing}\n\n${text}` : text);
  };

  const handleSave = async () => {
    if (!note || saving || savedId) return;
    setSaving(true);
    try {
      const saved = await saveNote({
        modelId: note.modelId,
        modelName: note.modelName,
        runtime: note.runtime,
        source,
        transcript,
        inputType,
        note,
      });
      setSavedId(saved.id);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Saved to your notes.");
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Couldn't save this note. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const copyNote = async () => {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(noteToPlainText(note));
      setCopied(true);
      setTimeout(() => setCopied(false), 1_500);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  const deviceBusy =
    isDevice &&
    isLoading &&
    (engineState?.status === "downloading" || engineState?.status === "loading");
  const deviceStreaming = isDevice && isLoading && liveText.length > 0;

  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-5">
      {/* Transcript / input */}
      <section
        className={cn(
          "flex flex-col overflow-hidden rounded-lg border border-border bg-background print:hidden",
          PANEL_MIN_H
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-border py-1.5 pl-4 pr-1.5 sm:pl-5">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Consultation input
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-11 text-muted-foreground sm:h-8"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Load a sample
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
          <RecorderPanel
            onTranscript={handleRecordedTranscript}
            disabled={isLoading}
          />
          <Tabs
            value={inputType}
            onValueChange={(v) => setInputType(v as RunInputType)}
          >
            <TabsList>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="structured_note">Rough note</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Editor absorbs the panel's spare height on tall viewports. */}
          <div className="flex min-h-0 flex-1 flex-col [&>div]:flex-1">
            <InputEditor
              value={transcript}
              onChange={(v) => {
                setTranscript(v);
                setSource("pasted");
              }}
              minHeight={280}
              placeholder={PLACEHOLDER}
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Model
            </span>
            <ModelPicker
              models={models}
              selectedId={selectedModelId}
              onSelect={setSelectedModelId}
              disabled={isLoading}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="h-11 flex-1 sm:h-9 sm:flex-none sm:px-4"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate note
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearTranscript}
                disabled={!transcript || isLoading}
                className="h-11 sm:h-9"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
              <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground sm:inline">
                ⌘↵ to generate
              </span>
            </div>
            {selectedModel && !modelUsable ? (
              <p className="rounded-md border border-status-offline/40 bg-status-offline/5 px-3 py-2 text-[12px] text-foreground">
                {selectedModel.statusDetail ??
                  `${selectedModel.name} is currently unavailable — pick another model.`}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Note output */}
      <section
        className={cn(
          "flex min-h-72 flex-col rounded-lg border border-border bg-background print:min-h-0 print:border-none",
          PANEL_MIN_H
        )}
      >
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b border-border py-1.5 pl-4 pr-1.5 sm:pl-5 print:hidden">
          <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {isLoading ? (
              <LiveDot className="bg-status-loading" />
            ) : note ? (
              <span
                className="h-1.5 w-1.5 rounded-full bg-status-online"
                aria-hidden="true"
              />
            ) : null}
            Clinical note
          </h2>
          {note && !isLoading ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={savedId ? "ghost" : "default"}
                onClick={() => void handleSave()}
                disabled={saving || !!savedId}
                className="h-11 sm:h-8"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : savedId ? (
                  <Check className="h-3.5 w-3.5 text-status-online" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {savedId ? "Saved" : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void copyNote()}
                className="h-11 sm:h-8"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-status-online" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <NoteExportMenu note={note} />
            </div>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-5 print:p-0">
          {deviceStreaming && selectedModel ? (
            <DeviceStreaming
              modelName={selectedModel.name}
              liveText={liveText}
              liveTps={liveTps}
              onStop={interrupt}
            />
          ) : deviceBusy && selectedModel ? (
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
          ) : note ? (
            /* The finished note reads as a document page, not a panel. */
            <div className="flex-1 rounded-md border border-border bg-card px-4 py-6 shadow-sm motion-safe:animate-fade-up sm:px-8 sm:py-8 print:rounded-none print:border-none print:bg-transparent print:p-0 print:shadow-none">
              <NoteDocument note={note} />
            </div>
          ) : (
            <NotePanelEmpty deviceSelected={!!isDevice} />
          )}
        </div>
      </section>

      <LocalModelGate
        model={selectedModel ?? null}
        open={gateOpen}
        onOpenChange={setGateOpen}
        onConfirm={() => void execute()}
      />
    </div>
  );
}
