"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Loader2,
  Mic,
  Radio,
  Square,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMb } from "@/lib/local/device";
import { useAsrStore } from "@/lib/local/asr";
import {
  ASR_MODELS,
  DEFAULT_ASR_MODEL_ID,
  getAsrModel,
} from "@/lib/local/asrCatalog";
import { useConsultationRecorder } from "@/components/scribe/useConsultationRecorder";

const BAR_COUNT = 28;

function mmss(totalS: number): string {
  const s = Math.floor(totalS);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Scrolling level meter driven by the recorder's RMS level. */
function LevelMeter({ level, active }: { level: number; active: boolean }) {
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(0));
  useEffect(() => {
    if (!active) return;
    setBars((prev) => [...prev.slice(1), level]);
  }, [level, active]);

  return (
    <div className="flex h-10 items-center gap-[3px]">
      {bars.map((b, i) => (
        <div
          key={i}
          className="w-full flex-1 rounded-full bg-status-online/80 transition-[height] duration-100"
          style={{ height: `${Math.max(6, Math.min(100, b * 100))}%` }}
        />
      ))}
    </div>
  );
}

interface RecorderPanelProps {
  /** Called with the final transcript once recording stops. */
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function RecorderPanel({ onTranscript, disabled }: RecorderPanelProps) {
  const [open, setOpen] = useState(false);
  const [asrModelId, setAsrModelId] = useState(DEFAULT_ASR_MODEL_ID);
  const [nearLive, setNearLive] = useState(true);
  const asrModel = getAsrModel(asrModelId);

  const asrState = useAsrStore((s) => s.states[asrModelId]);
  const asrDownloaded = useAsrStore((s) => !!s.downloaded[asrModelId]);

  const settledRef = useRef(false);
  const rec = useConsultationRecorder({
    asrModelId,
    nearLive,
    onComplete: (text) => {
      settledRef.current = true;
      if (text) onTranscript(text);
      setOpen(false);
    },
  });

  const isBusy = rec.status === "recording" || rec.status === "preparing";
  const progress = asrState?.progress;
  const pct =
    progress && progress.totalMb > 0
      ? Math.min(100, Math.round((progress.loadedMb / progress.totalMb) * 100))
      : null;

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="h-11 w-full justify-center border-dashed sm:h-9"
      >
        <Mic className="h-4 w-4" />
        Record consultation
      </Button>
    );
  }

  const isRecording = rec.status === "recording";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 transition-colors",
        isRecording && "border-status-offline/50"
      )}
    >
      {/* Settings row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Transcriber
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" disabled={isBusy} className="h-7 px-2">
                {asrModel?.name ?? "Model"}
                <span className="ml-1 rounded border border-border px-1 font-mono text-[10px] text-muted-foreground">
                  {asrModel?.sizeLabel}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                On-device speech model
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ASR_MODELS.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onSelect={() => setAsrModelId(m.id)}
                  className="flex-col items-start gap-0.5"
                >
                  <span className="flex w-full items-center justify-between">
                    <span>{m.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatMb(m.downloadMb)}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {m.description}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
          Live transcript
          <Switch
            checked={nearLive}
            onCheckedChange={setNearLive}
            disabled={isBusy}
          />
        </label>
      </div>

      {/* Main state area */}
      {rec.status === "error" ? (
        <div className="rounded-md border border-status-offline/50 bg-status-offline/5 px-3 py-2 text-[13px] text-foreground">
          {rec.error}
        </div>
      ) : rec.status === "preparing" ? (
        <div className="flex flex-col gap-2 py-1">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {asrState?.status === "downloading"
              ? `Downloading ${asrModel?.name}…`
              : "Preparing microphone…"}
          </div>
          {pct !== null && progress ? (
            <div className="flex flex-col gap-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-foreground/70 transition-[width]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {formatMb(progress.loadedMb)} of {formatMb(progress.totalMb)} — cached after the first time
              </span>
            </div>
          ) : null}
        </div>
      ) : rec.status === "transcribing" ? (
        <div className="flex items-center gap-3 py-3">
          <div className="flex h-4 items-end gap-[3px]" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-full w-[3px] origin-center rounded-full bg-status-loading/80 motion-safe:animate-wave"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Transcribing the full recording…
          </span>
        </div>
      ) : rec.status === "recording" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="flex items-baseline gap-2 text-status-offline">
              <span className="relative flex h-2.5 w-2.5 self-center" aria-hidden="true">
                <span className="absolute inset-0 rounded-full bg-status-offline/70 motion-safe:animate-pulse-ring" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-status-offline motion-safe:animate-pulse" />
              </span>
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em]">
                Rec
              </span>
              <span className="font-mono text-[14px] tabular-nums leading-none">
                {mmss(rec.elapsedS)}
              </span>
            </span>
            {nearLive ? (
              <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <Radio className="h-3 w-3" />
                live
              </span>
            ) : null}
          </div>
          <LevelMeter level={rec.level} active />
          {nearLive ? (
            <div className="max-h-28 min-h-14 overflow-auto rounded-md border border-border bg-background p-2 text-[13px] leading-relaxed text-foreground">
              {rec.partial || (
                <span className="text-muted-foreground">Listening…</span>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              Live transcript is off — the recording is transcribed when you stop.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 py-3 text-center">
          <p className="text-[13px] text-muted-foreground">
            Record the consultation and NeoScribe transcribes it on this device —
            audio never leaves the browser.
          </p>
          {!asrDownloaded ? (
            <p className="text-[11px] text-muted-foreground/80">
              First use downloads {asrModel?.name} (~{asrModel ? formatMb(asrModel.downloadMb) : ""}).
            </p>
          ) : null}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        {rec.status === "recording" ? (
          <Button size="sm" onClick={rec.stop} className="h-11 flex-1 sm:h-9">
            <Square className="h-3.5 w-3.5" />
            Stop & transcribe
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={rec.start}
            disabled={rec.status === "preparing" || rec.status === "transcribing"}
            className="h-11 flex-1 sm:h-9"
          >
            <Mic className="h-3.5 w-3.5" />
            {rec.status === "error" ? "Try again" : "Start recording"}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            rec.cancel();
            setOpen(false);
          }}
          disabled={rec.status === "transcribing"}
          className="h-11 sm:h-9"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </Button>
      </div>
    </div>
  );
}
