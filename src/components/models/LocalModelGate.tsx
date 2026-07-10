"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download,
  HardDrive,
  Info,
  Lock,
  MemoryStick,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLocalModel } from "@/lib/local/catalog";
import { assessFit, formatMb, type DeviceProfile } from "@/lib/local/device";
import { useDeviceProfile } from "@/lib/hooks/useModels";
import { cn } from "@/lib/utils";
import type { Model } from "@/lib/api/types";

const VERDICT_META = {
  good: {
    icon: CheckCircle2,
    className: "text-status-online",
    label: "Good fit for this device",
  },
  slow: {
    icon: AlertTriangle,
    className: "text-status-loading",
    label: "Will run, but may be slow",
  },
  blocked: {
    icon: XCircle,
    className: "text-status-offline",
    label: "Not recommended on this device",
  },
} as const;

function SpecRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-right font-mono text-[12px] text-foreground">
        {value}
      </span>
    </div>
  );
}

function deviceSummary(p: DeviceProfile): string {
  const parts: string[] = [];
  parts.push(p.webgpu ? "GPU acceleration available" : "CPU only (no WebGPU)");
  parts.push(p.ramGb !== null ? `~${p.ramGb} GB RAM reported` : "RAM not reported");
  if (p.cores) parts.push(`${p.cores} CPU cores`);
  return parts.join(" · ");
}

interface LocalModelGateProps {
  model: Model | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user confirms the download. */
  onConfirm: (modelId: string) => void;
}

/**
 * Pre-download check for on-device models: shows exactly what will be
 * downloaded, what the device needs, and an honest verdict before anything
 * heavy happens.
 */
export function LocalModelGate({
  model,
  open,
  onOpenChange,
  onConfirm,
}: LocalModelGateProps) {
  const profile = useDeviceProfile();
  const def = model ? getLocalModel(model.id) : undefined;

  const fit = useMemo(
    () => (def && profile ? assessFit(def, profile) : null),
    [def, profile]
  );

  if (!model || !def) return null;

  const verdict = fit ? VERDICT_META[fit.verdict] : null;
  const VerdictIcon = verdict?.icon ?? Info;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            On-device · pre-flight check
          </p>
          <DialogTitle>Run {model.name} on this device</DialogTitle>
          <DialogDescription>{def.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="divide-y divide-border/60 rounded-md border border-border bg-muted/30 px-3 py-1">
            <SpecRow
              icon={Download}
              label="One-time download"
              value={fit ? formatMb(fit.downloadMb) : "…"}
            />
            <SpecRow
              icon={MemoryStick}
              label="Memory needed while running"
              value={`~${def.minRamGb} GB`}
            />
            <SpecRow
              icon={Cpu}
              label="Will run on"
              value={fit?.backendLabel ?? "…"}
            />
            <SpecRow
              icon={HardDrive}
              label="Stored in"
              value="Browser cache (removable anytime)"
            />
          </div>

          {profile ? (
            <p className="font-mono text-[11px] text-muted-foreground">
              This device: {deviceSummary(profile)}
            </p>
          ) : (
            <p className="font-mono text-[11px] text-muted-foreground">
              Checking this device…
            </p>
          )}

          {fit && verdict ? (
            <div
              className={cn(
                "flex flex-col gap-2 rounded-md border p-3",
                fit.verdict === "good" && "border-status-online/40 bg-status-online/5",
                fit.verdict === "slow" && "border-status-loading/40 bg-status-loading/5",
                fit.verdict === "blocked" && "border-status-offline/40 bg-status-offline/5"
              )}
            >
              <span
                className={cn(
                  "flex items-center gap-2 text-[13px] font-medium",
                  verdict.className
                )}
              >
                <VerdictIcon className="h-4 w-4" />
                {verdict.label}
              </span>
              <ul className="flex flex-col gap-1">
                {fit.notes.map((note, i) => (
                  <li key={i} className="text-[12px] leading-relaxed text-foreground">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="flex items-start gap-2 text-[12px] text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Everything runs inside your browser. The transcript is processed on
            this device and is never sent to a server by the model.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {fit?.verdict === "blocked" ? (
            <Button disabled>
              <XCircle className="h-3.5 w-3.5" />
              Can&apos;t run here
            </Button>
          ) : (
            <Button
              disabled={!fit}
              onClick={() => {
                onConfirm(model.id);
                onOpenChange(false);
              }}
            >
              <Download className="h-3.5 w-3.5" />
              {fit?.verdict === "slow" ? "Download anyway" : "Download & prepare"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
