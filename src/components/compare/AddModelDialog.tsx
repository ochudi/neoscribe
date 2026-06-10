"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RuntimeBadge, StatusDot, statusLabel } from "@/components/chat/shared";
import { cn } from "@/lib/utils";
import type { Model } from "@/lib/api/types";

interface AddModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: Model[];
  excludeIds: string[];
  onAdd: (modelId: string) => void;
}

export function AddModelDialog({
  open,
  onOpenChange,
  models,
  excludeIds,
  onAdd,
}: AddModelDialogProps) {
  const [pendingId, setPendingId] = useState("");

  useEffect(() => {
    if (!open) setPendingId("");
  }, [open]);

  const grouped = useMemo(() => {
    const options = models.filter(
      (m) => !excludeIds.includes(m.id) && m.status !== "offline"
    );
    return {
      cloud: options.filter((m) => m.runtime === "cloud"),
      device: options.filter((m) => m.runtime === "device"),
      total: options.length,
    };
  }, [models, excludeIds]);

  const handleConfirm = () => {
    if (!pendingId) return;
    onAdd(pendingId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a model to compare</DialogTitle>
          <DialogDescription>
            Up to three models run side-by-side. On-device models run one at a
            time and may need a one-time download.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-80 flex-col gap-3 overflow-auto">
          {grouped.total === 0 ? (
            <p className="px-1 py-3 text-[13px] text-muted-foreground">
              All available models are already in the comparison.
            </p>
          ) : (
            (
              [
                ["cloud", "Cloud", grouped.cloud],
                ["device", "On-device", grouped.device],
              ] as const
            ).map(([key, label, items]) =>
              items.length === 0 ? null : (
                <div key={key} className="flex flex-col gap-1.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                  {items.map((m) => {
                    const active = pendingId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPendingId(m.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-[13px] transition-colors",
                          active
                            ? "border-foreground bg-muted text-foreground"
                            : "border-border text-foreground hover:bg-muted/50"
                        )}
                      >
                        <StatusDot status={m.status} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{m.name}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {statusLabel(m)}
                          </span>
                        </span>
                        <RuntimeBadge runtime={m.runtime} />
                        <span className="rounded border border-border px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {m.sizeLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            )
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!pendingId}>
            Add to comparison
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
