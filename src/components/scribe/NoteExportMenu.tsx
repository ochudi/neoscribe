"use client";

import { ChevronDown, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportDocx, exportMarkdown, exportPdf } from "@/lib/notes/exporters";
import type { ClinicalNote } from "@/lib/notes/types";

export function NoteExportMenu({
  note,
  disabled,
}: {
  note: ClinicalNote;
  disabled?: boolean;
}) {
  const handlePdf = () => {
    const ok = exportPdf(note);
    if (!ok) {
      toast.error("Your browser blocked the print window. Allow pop-ups for this site, then try again.");
    }
  };

  const handleDocx = async () => {
    try {
      await exportDocx(note);
    } catch {
      toast.error("Couldn't build the Word document. Try Markdown or PDF instead.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          className="h-11 sm:h-8"
        >
          <Download className="h-3.5 w-3.5" />
          Download
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handlePdf}>PDF</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void handleDocx()}>
          Word (.docx)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportMarkdown(note)}>
          Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
