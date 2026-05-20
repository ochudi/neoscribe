"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  CircleAlert,
  Columns3,
  Play,
  RotateCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExtractionOutput } from "@/components/chat/ExtractionOutput";
import { InputEditor } from "@/components/chat/InputEditor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusDot } from "@/components/chat/shared";
import { cn } from "@/lib/utils";
import { extractWithModel, listModels } from "@/lib/api/client";
import { useChatStore, type ChatInputType } from "@/lib/stores/chatStore";
import type { Model } from "@/lib/api/mocks";

const PLACEHOLDERS: Record<ChatInputType, string> = {
  transcript:
    "Paste a clinician–patient transcript here.\n\nExample:\nPatient: I've had this cough for three days...\nClinician: Any fever?\nPatient: Mild, comes and goes.",
  structured_note:
    "Paste or compose a structured clinical note.\n\n## HPI\n...\n\n## ROS\n...\n\n## Medications\n...",
};

function CompareDialog({
  open,
  onOpenChange,
  models,
  selectedModelId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: Model[];
  selectedModelId: string;
}) {
  const router = useRouter();
  const [partnerId, setPartnerId] = useState<string>("");

  const options = useMemo(
    () => models.filter((m) => m.id !== selectedModelId),
    [models, selectedModelId]
  );

  useEffect(() => {
    if (!open) setPartnerId("");
  }, [open]);

  const handleConfirm = () => {
    if (!partnerId || !selectedModelId) return;
    const params = new URLSearchParams({
      model: selectedModelId,
      with: partnerId,
    });
    router.push(`/compare?${params.toString()}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compare with another model</DialogTitle>
          <DialogDescription>
            We&apos;ll preload your input on the compare page.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-72 flex-col gap-1 overflow-auto">
          {options.map((m) => {
            const active = partnerId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPartnerId(m.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-[13px] transition-colors",
                  active
                    ? "border-foreground bg-muted text-foreground"
                    : "border-border text-foreground hover:bg-muted/50"
                )}
              >
                <StatusDot status={m.status} />
                <span className="flex-1 truncate">{m.name}</span>
                <span className="rounded border border-border px-1 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {m.location}
                </span>
                <span className="rounded border border-border px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {m.sizeLabel}
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!partnerId}>
            Open Compare
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
      Processing... ({elapsed.toFixed(1)}s)
    </span>
  );
}

function ShimmerBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-3 w-full overflow-hidden rounded bg-muted",
        className
      )}
    >
      <div className="h-full w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
    </div>
  );
}

function OutputEmpty() {
  return (
    <div className="flex h-full items-center justify-center px-6 py-10">
      <p className="text-center text-[13px] text-muted-foreground">
        Output will appear here. Paste a transcript above and hit Run.
      </p>
    </div>
  );
}

function OutputLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Extracting
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

function OutputError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="p-6">
      <div className="flex flex-col gap-3 rounded-md border border-status-offline/60 bg-status-offline/5 p-4">
        <div className="flex items-center gap-2 text-status-offline">
          <CircleAlert className="h-4 w-4" />
          <span className="text-[13px] font-medium">Extraction failed</span>
        </div>
        <p className="font-mono text-[12px] text-foreground">{message}</p>
        <div>
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}


export function CenterColumn() {
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
  const setError = useChatStore((s) => s.setError);
  const clearInput = useChatStore((s) => s.clearInput);

  const [compareOpen, setCompareOpen] = useState(false);

  const { data: models } = useQuery({
    queryKey: ["models"],
    queryFn: listModels,
    refetchInterval: 15_000,
  });

  const canRun = !!selectedModelId && inputContent.trim().length > 0 && !isLoading;

  const handleRun = async () => {
    if (!selectedModelId || !inputContent.trim()) return;
    setIsLoading(true);
    setError(null);
    setExtraction(null);
    try {
      const res = await extractWithModel(selectedModelId, {
        transcript: inputContent,
      });
      setExtraction(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!extraction) return;
    toast.success("Saved to history", {
      description: `${Object.values(extraction.results).flat().length} items from ${extraction.modelId}`,
    });
  };

  const minHeight = inputType === "transcript" ? 240 : 360;
  const placeholder = PLACEHOLDERS[inputType];

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="grid h-full grid-rows-2 divide-y divide-border">
        <section className="flex min-h-0 flex-col">
          <Tabs
            value={inputType}
            onValueChange={(v) => setInputType(v as ChatInputType)}
            className="border-b border-border px-6 pt-4"
          >
            <TabsList>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="structured_note">Structured Note</TabsTrigger>
            </TabsList>
          </Tabs>

          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-3 px-6 py-4">
              <InputEditor
                value={inputContent}
                onChange={setInputContent}
                minHeight={minHeight}
                placeholder={placeholder}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleRun}
                  disabled={!canRun}
                >
                  <Play className="h-3.5 w-3.5" />
                  Run
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearInput}
                  disabled={!inputContent}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSave}
                  disabled={!extraction}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  Save to History
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCompareOpen(true)}
                  disabled={!selectedModelId}
                >
                  <Columns3 className="h-3.5 w-3.5" />
                  Compare with…
                </Button>
              </div>
            </div>
          </ScrollArea>
        </section>

        <section className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Output
            </span>
            {selectedModelId ? (
              <span className="font-mono text-[12px] text-muted-foreground">
                model: {selectedModelId}
              </span>
            ) : null}
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <OutputLoading />
            ) : error ? (
              <OutputError message={error} onRetry={handleRun} />
            ) : extraction ? (
              <div className="p-6">
                <ExtractionOutput extraction={extraction} />
              </div>
            ) : (
              <OutputEmpty />
            )}
          </ScrollArea>
        </section>
      </div>

      <CompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        models={models ?? []}
        selectedModelId={selectedModelId}
      />
    </div>
  );
}
