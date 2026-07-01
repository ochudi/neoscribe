"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RuntimeBadge, StatusDot, statusLabel } from "@/components/chat/shared";
import type { Model } from "@/lib/api/types";

interface ModelPickerProps {
  models: Model[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function ModelPicker({
  models,
  selectedId,
  onSelect,
  disabled,
}: ModelPickerProps) {
  const selected = models.find((m) => m.id === selectedId);
  const cloud = models.filter((m) => m.runtime === "cloud");
  const device = models.filter((m) => m.runtime === "device");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="min-w-0 max-w-full justify-between gap-2"
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected ? <StatusDot status={selected.status} /> : null}
            <span className="truncate">
              {selected ? selected.name : "Choose a model"}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[60vh] w-72 overflow-auto">
        {(
          [
            ["Cloud", cloud],
            ["On-device", device],
          ] as const
        ).map(([label, items]) =>
          items.length === 0 ? null : (
            <div key={label}>
              <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {label}
              </DropdownMenuLabel>
              {items.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onSelect={() => onSelect(m.id)}
                  disabled={m.status === "offline"}
                  className="gap-2"
                >
                  <StatusDot status={m.status} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{m.name}</span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {statusLabel(m)}
                    </span>
                  </span>
                  <RuntimeBadge runtime={m.runtime} />
                  <span className="rounded border border-border px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {m.sizeLabel}
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </div>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
