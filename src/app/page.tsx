import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Cloud,
  Columns3,
  Download,
  FileText,
  Mic,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { LandingNav } from "@/components/marketing/LandingNav";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://neoscribe.vercel.app";

const description =
  "NeoScribe records a consultation, transcribes it on your device, and turns it into a structured clinical note you can edit and export to PDF, Word, or Markdown. Cloud or in-browser models, your call.";

export const metadata: Metadata = {
  title: { absolute: "NeoScribe: the clinical scribe that runs on your device" },
  description,
  alternates: { canonical: siteUrl },
  openGraph: {
    type: "website",
    siteName: "NeoScribe",
    title: "NeoScribe: the clinical scribe that runs on your device",
    description,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "NeoScribe: the clinical scribe that runs on your device",
    description,
  },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </span>
  );
}

const WAVE = [
  8, 16, 30, 22, 44, 60, 38, 52, 72, 40, 24, 48, 66, 34, 18, 40, 56, 28, 14, 36,
  50, 30, 20, 44, 62, 34, 16, 26,
];

/** Static faux-app visual: a recording turning into a structured note. */
function HeroVisual() {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-muted" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted" />
        </span>
        <span className="ml-2 font-mono text-[11px] text-muted-foreground">
          consultation.session
        </span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-status-offline">
          <span className="h-2 w-2 rounded-full bg-status-offline" />
          rec 02:14
        </span>
      </div>

      {/* waveform */}
      <div className="flex h-16 items-center gap-[3px] border-b border-border px-4">
        {WAVE.map((h, i) => (
          <span
            key={i}
            className="w-full flex-1 rounded-full bg-status-online/70"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      {/* note */}
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-foreground">
            Clinical Note
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            structured
          </span>
        </div>
        {[
          {
            label: "Presenting complaint",
            line: "Productive cough for 6 weeks, with weight loss.",
          },
          {
            label: "Assessment",
            line: "Working impression: pulmonary tuberculosis, rule out chest infection.",
          },
          { label: "Plan", line: null },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1.5">
            <Eyebrow>{s.label}</Eyebrow>
            {s.line ? (
              <p className="text-[13px] leading-relaxed text-foreground/90">
                {s.line}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="h-2 w-full rounded bg-muted" />
                <span className="h-2 w-4/5 rounded bg-muted" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  children,
}: {
  n: string;
  icon: typeof Mic;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-6">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border">
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">{n}</span>
      </div>
      <h3 className="text-[16px] font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

const FEATURES = [
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

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <LandingNav />

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-24 lg:pt-20">
        <div className="flex flex-col justify-center gap-6">
          <Eyebrow>Plural Health · clinical documentation</Eyebrow>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[56px]">
            Record the consult.
            <br />
            NeoScribe writes the note.
          </h1>
          <p className="max-w-xl text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
            Speech to transcript to a clean, structured clinical note, most of it
            running right in your browser. Review it, fix anything, and export to
            PDF, Word, or Markdown. The patient&apos;s audio never has to touch a
            server.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Open NeoScribe
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/scribe"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-5 text-[14px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Mic className="h-4 w-4" />
              Try the scribe
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>On-device transcription</span>
            <span className="hidden h-3 w-px bg-border sm:block" />
            <span>PDF · Word · Markdown</span>
            <span className="hidden h-3 w-px bg-border sm:block" />
            <span>Cloud or in-browser</span>
          </div>
        </div>
        <div className="flex items-center">
          <HeroVisual />
        </div>
      </section>

      {/* Runtimes */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="flex flex-col gap-3">
            <Eyebrow>Two ways to run it</Eyebrow>
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              The big hosted models when you want them. Your own hardware when you
              don&apos;t.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border">
                  <Cloud className="h-5 w-5" />
                </span>
                <h3 className="text-[17px] font-semibold text-foreground">
                  Cloud models
                </h3>
              </div>
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                Hosted GPUs through Hugging Face. Reach for the heavy hitters,
                Llama 3.3 70B, GPT-OSS 20B, Gemma, when you want the strongest
                structured output and you&apos;re fine sending text to a provider.
              </p>
              <p className="mt-auto font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Best quality · a few seconds per note
              </p>
            </div>
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border">
                  <MonitorSmartphone className="h-5 w-5" />
                </span>
                <h3 className="text-[17px] font-semibold text-foreground">
                  On-device models
                </h3>
              </div>
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                Whisper, SmolLM, Qwen, and Gemma running in your browser over
                WebGPU or WASM. The input never leaves the machine. Free every
                time, and oddly satisfying to watch the tokens land.
              </p>
              <p className="mt-auto font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Private · nothing leaves the device
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="flex flex-col gap-3">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Three steps, and none of them is typing it up later.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Step n="01" icon={Mic} title="Capture">
            Record the consultation or paste a transcript. With live transcription
            on, the words show up as they are spoken.
          </Step>
          <Step n="02" icon={Sparkles} title="Structure">
            Pick any model. NeoScribe turns the back-and-forth into complaints,
            history, examination, assessment, and plan.
          </Step>
          <Step n="03" icon={Download} title="Export">
            Read it back, correct anything, and download a tidy note as PDF, Word,
            or Markdown to drop into the record.
          </Step>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex gap-4 rounded-xl border border-border bg-background p-6"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border">
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
        </div>
      </section>

      {/* Privacy CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-background px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-border">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Built for the room, not the cloud.
          </h2>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            The default path keeps the recording and the transcript on your
            device. Whisper does the listening locally, and you decide if anything
            ever leaves. When you want a hosted model, that&apos;s one click, and
            NeoScribe is upfront about what gets sent.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open NeoScribe
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex flex-col gap-1">
            <span className="text-[14px] font-semibold tracking-tight text-foreground">
              NeoScribe
            </span>
            <span className="text-[12px] text-muted-foreground">
              A Plural Health project.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/scribe" className="hover:text-foreground">
              Scribe
            </Link>
            <Link href="/compare" className="hover:text-foreground">
              Compare
            </Link>
            <Link href="/models" className="hover:text-foreground">
              Models
            </Link>
            <a
              href="https://www.pluralhealth.ai"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              Plural Health
            </a>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            Hugging Face · Supabase · Vercel
          </p>
        </div>
      </footer>
    </div>
  );
}
