"use client";

import { ChevronDown, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ExportFormat = "pdf" | "markdown" | "json";

interface ExportMenuProps {
  disabled?: boolean;
  onExport: (format: ExportFormat) => void;
}

export function ExportMenu({ disabled, onExport }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <Download className="h-3.5 w-3.5" />
          Export comparison
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onExport("pdf")}>
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onExport("markdown")}>
          Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onExport("json")}>
          JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
