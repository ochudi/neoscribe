"use client";

import { Sparkles } from "lucide-react";

import type { ClinicalNote } from "@/lib/notes/types";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="print-break-inside-avoid border-t border-border pt-4">
      <h3 className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      <div className="text-[14px] leading-[1.7] text-foreground">{children}</div>
    </section>
  );
}

function Prose({ text }: { text: string }) {
  return <p className="whitespace-pre-wrap">{text}</p>;
}

function ItemList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="select-none text-muted-foreground">•</span>
          <span className="min-w-0 flex-1">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function NoteDocument({ note }: { note: ClinicalNote }) {
  const exam = note.examination;
  const hasExam = exam.general || exam.vitals.length || exam.systems.length;

  return (
    <article className="mx-auto flex max-w-[70ch] flex-col gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-[19px] font-semibold tracking-tight text-foreground">
            Clinical Note
          </h2>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {fmtDate(note.completedAt)}
          </span>
        </div>
        {note.patientSummary ? (
          <p className="text-[14px] italic leading-[1.7] text-muted-foreground">
            {note.patientSummary}
          </p>
        ) : null}
      </header>

      {note.presentingComplaints.length ? (
        <Section title="Presenting complaints">
          <ItemList items={note.presentingComplaints} />
        </Section>
      ) : null}

      {note.history ? (
        <Section title="History of presenting complaint">
          <Prose text={note.history} />
        </Section>
      ) : null}

      {note.pastHistory ? (
        <Section title="Past medical & surgical history">
          <Prose text={note.pastHistory} />
        </Section>
      ) : null}

      {note.medications.length ? (
        <Section title="Medications">
          <ItemList items={note.medications} />
        </Section>
      ) : null}

      {note.socialFamilyHistory ? (
        <Section title="Social & family history">
          <Prose text={note.socialFamilyHistory} />
        </Section>
      ) : null}

      {hasExam ? (
        <Section title="Examination">
          <div className="flex flex-col gap-3">
            {exam.general ? <Prose text={exam.general} /> : null}
            {exam.vitals.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {exam.vitals.map((v, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-border bg-muted/30 px-3 py-2"
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {v.label}
                    </div>
                    <div className="mt-0.5 text-[14px] tabular-nums text-foreground">
                      {v.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {exam.systems.length ? (
              <ul className="flex flex-col gap-1.5">
                {exam.systems.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-medium">{s.name}:</span>
                    <span className="min-w-0 flex-1">{s.findings}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Section>
      ) : null}

      {note.investigations.length ? (
        <Section title="Investigations">
          <ItemList items={note.investigations} />
        </Section>
      ) : null}

      {note.assessment ? (
        <Section title="Assessment">
          <Prose text={note.assessment} />
        </Section>
      ) : null}

      {note.plan.length ? (
        <Section title="Plan">
          <ItemList items={note.plan} />
        </Section>
      ) : null}

      {note.recommendations.length ? (
        <Section title="Recommendations">
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              AI-suggested next steps
            </div>
            <ItemList items={note.recommendations} />
          </div>
        </Section>
      ) : null}

      <footer className="print-break-inside-avoid mt-1 flex flex-col gap-1 border-t border-border pt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
        <span>
          Generated by {note.modelName} · {fmtDate(note.completedAt)}
          {note.source === "synthesised"
            ? " · synthesised from structured findings"
            : ""}
        </span>
        <span className="uppercase tracking-[0.18em] text-[10px]">
          AI-generated draft — review before clinical use
        </span>
      </footer>
    </article>
  );
}
