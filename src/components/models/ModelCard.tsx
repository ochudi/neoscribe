"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  RuntimeBadge,
  StatusDot,
  statusLabel,
} from "@/components/chat/shared";
import { LocalModelGate } from "@/components/models/LocalModelGate";
import { formatMb } from "@/lib/local/device";
import {
  ensureLoaded,
  removeDownload,
  useLocalEngineStore,
} from "@/lib/local/engine";
import type { Model } from "@/lib/api/types";

function DownloadProgress({ modelId }: { modelId: string }) {
  const runtime = useLocalEngineStore((s) => s.states[modelId]);
  if (!runtime?.progress) {
    return (
      <p className="font-mono text-[11px] text-muted-foreground">
        Starting download…
      </p>
    );
  }
  const { loadedMb, totalMb } = runtime.progress;
  const pct = totalMb > 0 ? Math.min(100, Math.round((loadedMb / totalMb) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-foreground/70 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        {formatMb(loadedMb)} of {formatMb(totalMb)} ({pct}%)
      </p>
    </div>
  );
}

export function ModelCard({ model }: { model: Model }) {
  const [gateOpen, setGateOpen] = useState(false);

  const isDevice = model.runtime === "device";
  const runtime = useLocalEngineStore((s) => s.states[model.id]);
  const downloaded = useLocalEngineStore((s) => !!s.downloaded[model.id]);
  const busy =
    runtime?.status === "downloading" ||
    runtime?.status === "loading" ||
    runtime?.status === "generating";
  const unsupported = isDevice && model.status === "offline";

  const startDownload = async (modelId: string) => {
    try {
      await ensureLoaded(modelId);
      toast.success(`${model.name} is ready`, {
        description: "Downloaded and loaded on this device.",
      });
    } catch (e) {
      toast.error("Couldn't prepare the model", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const handleRemove = async () => {
    await removeDownload(model.id);
    toast.success(`${model.name} removed from this device`);
  };

  return (
    <div className="flex flex-col rounded-lg border border-border bg-background transition-colors hover:border-foreground/15">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <h3 className="text-[16px] font-semibold leading-tight text-foreground">
          {model.name}
        </h3>
        <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-foreground">
          {model.sizeLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-3 pt-2">
        <RuntimeBadge runtime={model.runtime} />
        <span className="font-mono text-[12px] text-muted-foreground">
          {model.provider}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <StatusDot status={model.status} />
          <span className="text-[12px] text-foreground">{statusLabel(model)}</span>
        </span>
      </div>

      <div className="border-t border-border" />

      <p className="px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
        {model.description}
      </p>

      <div className="flex flex-col gap-2 px-4 pb-3 text-[12px] text-muted-foreground">
        {isDevice ? (
          <span className="font-mono text-[11px]">
            {model.downloadMb ? `${formatMb(model.downloadMb)} download` : ""}
            {model.minRamGb ? ` · needs ~${model.minRamGb} GB RAM` : ""}
            {" · runs in your browser"}
          </span>
        ) : (
          <span className="font-mono text-[11px]">
            {model.typicalLatencyS
              ? `Typically ~${model.typicalLatencyS}s per extraction`
              : ""}
            {" · hosted via Hugging Face"}
          </span>
        )}
        {isDevice && runtime?.status === "downloading" ? (
          <DownloadProgress modelId={model.id} />
        ) : null}
        {unsupported && model.statusDetail ? (
          <p className="rounded-md border border-status-offline/40 bg-status-offline/5 p-2 text-[12px] text-foreground">
            {model.statusDetail}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
        {!unsupported ? (
          <Button asChild size="sm">
            <Link href={`/chat?model=${encodeURIComponent(model.id)}`}>
              Try in Workspace
            </Link>
          </Button>
        ) : null}
        {!unsupported ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/compare?model=${encodeURIComponent(model.id)}`}>
              Compare
            </Link>
          </Button>
        ) : null}

        <span className="ml-auto flex items-center gap-1">
          {isDevice && !downloaded && !busy && !unsupported ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setGateOpen(true)}
              className="text-muted-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          ) : null}
          {isDevice && downloaded && !busy ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              className="text-muted-foreground"
              title="Delete the model files from this browser"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          ) : null}
          {model.hfUrl ? (
            <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
              <a href={model.hfUrl} target="_blank" rel="noreferrer">
                Model card
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
        </span>
      </div>

      <LocalModelGate
        model={model}
        open={gateOpen}
        onOpenChange={setGateOpen}
        onConfirm={startDownload}
      />
    </div>
  );
}
