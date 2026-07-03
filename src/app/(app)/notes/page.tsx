"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleAlert,
  FileText,
  Mic,
  RotateCw,
  SquarePen,
  Trash2,
} from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RuntimeBadge } from "@/components/chat/shared";
import { NoteDocument } from "@/components/scribe/NoteDocument";
import { NoteExportMenu } from "@/components/scribe/NoteExportMenu";
import { deleteNote, listNotes } from "@/lib/api/client";
import { useScribeStore } from "@/lib/stores/scribeStore";
import type { RunInputType } from "@/lib/api/types";
import type { SavedNote } from "@/lib/notes/types";

/** Rough count of structured items captured in a note, for the card meta line. */
function noteItemCount(n: SavedNote): number {
  const { note } = n;
  return (
    note.presentingComplaints.length +
    note.medications.length +
    note.investigations.length +
    note.plan.length +
    note.recommendations.length +
    note.examination.systems.length
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function noteSnippet(n: SavedNote): string {
  return (
    n.note.patientSummary ||
    n.note.presentingComplaints[0] ||
    n.note.assessment ||
    n.transcript.slice(0, 140) ||
    "Empty note"
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4">
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
    </div>
  );
}

export default function NotesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: notes, isLoading, isError, refetch } = useQuery({
    queryKey: ["notes"],
    queryFn: () => listNotes(),
    refetchOnWindowFocus: false,
  });

  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const active = notes?.find((n) => n.id === openId) ?? null;

  const setTranscript = useScribeStore((s) => s.setTranscript);
  const setInputType = useScribeStore((s) => s.setInputType);
  const setNote = useScribeStore((s) => s.setNote);
  const setSelectedModelId = useScribeStore((s) => s.setSelectedModelId);

  const reopen = (n: SavedNote) => {
    setTranscript(n.transcript);
    setInputType((n.inputType as RunInputType) ?? "transcript");
    setNote(n.note);
    setSelectedModelId(n.note.modelId);
    router.push("/scribe");
  };

  const remove = async (id: string) => {
    setDeleting(true);
    try {
      await deleteNote(id);
      setOpenId(null);
      qc.invalidateQueries({ queryKey: ["notes"] });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageContainer
      title="Notes"
      description="Every clinical note you've saved — reopen, export, or clear them out."
    >
      <div className="mx-auto w-full max-w-4xl">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border py-16 text-center">
            <CircleAlert className="h-7 w-7 text-status-offline" />
            <p className="text-[14px] text-foreground">
              Couldn&apos;t load your notes.
            </p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              <RotateCw className="h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        ) : !notes || notes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-[14px] text-foreground">No saved notes yet.</p>
            <p className="max-w-sm text-[13px] text-muted-foreground">
              Generate a clinical note in the Scribe, then hit Save to keep it
              here across devices.
            </p>
            <Button asChild size="sm">
              <Link href="/scribe">Open the Scribe</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {notes.map((n) => {
              const itemCount = noteItemCount(n);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setOpenId(n.id)}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-foreground/25 hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[14px] font-medium text-foreground">
                      {n.modelName}
                    </span>
                    <RuntimeBadge runtime={n.runtime} />
                  </div>
                  <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                    {noteSnippet(n)}
                  </p>
                  <div className="mt-1 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                    <span>{fmtDate(n.savedAt)}</span>
                    <span className="inline-flex items-center gap-1">
                      {n.source === "recorded" ? (
                        <Mic className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      {n.source}
                    </span>
                    <span>{itemCount} items</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
        >
          {active ? (
            <>
              <SheetHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                <SheetTitle className="text-[15px]">Saved note</SheetTitle>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => reopen(active)}>
                    <SquarePen className="h-3.5 w-3.5" />
                    Reopen
                  </Button>
                  <NoteExportMenu note={active.note} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void remove(active.id)}
                    disabled={deleting}
                    className="text-status-offline hover:text-status-offline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-auto p-4 sm:p-6">
                <NoteDocument note={active.note} />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
