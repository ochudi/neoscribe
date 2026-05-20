"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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
import type { Model } from "@/lib/api/mocks";

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

  const options = models.filter((m) => !excludeIds.includes(m.id));

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
            Up to three models can be compared side-by-side.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-72 flex-col gap-1 overflow-auto">
          {options.length === 0 ? (
            <p className="px-1 py-3 text-[13px] text-muted-foreground">
              All available models are already in the comparison.
            </p>
          ) : (
            options.map((m) => {
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
                  <span className="flex-1 truncate">{m.name}</span>
                  <span className="rounded border border-border px-1 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {m.location}
                  </span>
                  <span className="rounded border border-border px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {m.sizeLabel}
                  </span>
                </button>
              );
            })
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
