"use client";

import {
  Columns3,
  FileText,
  MonitorSmartphone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

const FEATURES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: MonitorSmartphone,
    title: "On-device by default",
    body: "Whisper and small language models run in the browser over WebGPU or WASM. The recording and the transcript stay on the machine unless you reach for a cloud model.",
  },
  {
    icon: Columns3,
    title: "Compare, don't guess",
    body: "Run the same consult through two or three models at once and see who caught the diagnosis, the dose, and the follow-up.",
  },
  {
    icon: ShieldCheck,
    title: "Honest about limits",
    body: "When a model is too heavy for your device or a provider is having a bad day, NeoScribe tells you in plain English instead of spinning forever.",
  },
  {
    icon: FileText,
    title: "Every run kept",
    body: "Transcripts and notes are saved and searchable, so last Tuesday's clinic is one click away when the paperwork catches up with you.",
  },
];

/**
 * Feature cards with a soft spotlight that follows the cursor. Driven by two
 * CSS variables set on pointermove; zero animation loops, inert on touch.
 */
export function FeatureGrid() {
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--sy", `${e.clientY - rect.top}px`);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {FEATURES.map((f) => (
        <div
          key={f.title}
          onPointerMove={onMove}
          className="group relative flex gap-4 overflow-hidden rounded-xl border border-border bg-background p-6 transition-colors hover:border-foreground/25"
        >
          {/* spotlight layer */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 [@media(hover:hover)]:group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(220px circle at var(--sx, 50%) var(--sy, 50%), hsl(var(--foreground) / 0.05), transparent 70%)",
            }}
          />
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border transition-colors group-hover:border-foreground/30">
            <f.icon className="h-5 w-5" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[15px] font-semibold text-foreground">
              {f.title}
            </h3>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              {f.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
