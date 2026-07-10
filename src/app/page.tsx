import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Cloud,
  Download,
  Mic,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { LandingNav } from "@/components/marketing/LandingNav";
import { HeroStage } from "@/components/marketing/HeroStage";
import { HeroBackdrop } from "@/components/marketing/HeroBackdrop";
import { EcgDivider } from "@/components/marketing/EcgDivider";
import { ShorthandTicker } from "@/components/marketing/ShorthandTicker";
import { StatStrip } from "@/components/marketing/StatStrip";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { Reveal } from "@/components/marketing/Reveal";

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

const STRIP_WAVE = [
  18, 34, 52, 28, 64, 40, 76, 36, 58, 24, 70, 44, 84, 30, 54, 22, 66, 38, 78,
  32, 60, 26, 48, 72, 42, 62, 28, 74, 46, 20,
];

/**
 * Mobile-only stand-in for the desktop app window: a quiet live waveform
 * under the CTAs. Fades out at both ends; sits still under reduced motion.
 */
function WaveStrip() {
  return (
    <div
      aria-hidden
      className="flex h-9 items-center gap-[3px] [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]"
    >
      {STRIP_WAVE.map((h, i) => (
        <span
          key={i}
          className="flex-1 origin-center rounded-full bg-status-online/60 motion-safe:animate-wave"
          style={{
            height: `${h}%`,
            animationDelay: `${(i % 8) * 0.11}s`,
            animationDuration: `${1.1 + (i % 5) * 0.14}s`,
          }}
        />
      ))}
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
    <div className="group flex flex-col gap-3 rounded-lg border border-border bg-background p-6 transition-colors hover:border-foreground/25 hover:bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border transition-colors group-hover:border-foreground/30">
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">{n}</span>
      </div>
      <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* ambient backdrop: dot grid that lights up around the cursor */}
        <HeroBackdrop />

        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-24 lg:pt-20">
          <div className="flex flex-col justify-center gap-6">
            <Reveal>
              <Eyebrow>NeoScribe · clinical documentation</Eyebrow>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[56px]">
                Record the consult.
                <br />
                NeoScribe writes the note.
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="max-w-xl text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
                Speech to transcript to a clean, structured clinical note, most
                of it running right in your browser. Review it, fix anything,
                and export to PDF, Word, or Markdown. The patient&apos;s audio
                never has to touch a server.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/dashboard"
                  className="group inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Open NeoScribe
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/scribe"
                  className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-5 text-[14px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Mic className="h-4 w-4" />
                  Try the scribe
                </Link>
              </div>
            </Reveal>
            <Reveal delay={210} className="pt-2 lg:hidden">
              <WaveStrip />
            </Reveal>
            <Reveal delay={240}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <span>On-device transcription</span>
                <span className="hidden h-3 w-px bg-border sm:block" />
                <span>PDF · Word · Markdown</span>
                <span className="hidden h-3 w-px bg-border sm:block" />
                <span>Cloud or in-browser</span>
              </div>
            </Reveal>
          </div>
          {/* Desktop-only: the phone hero stays typographic and uncluttered. */}
          <Reveal delay={160} className="hidden items-center lg:flex">
            <HeroStage />
          </Reveal>
        </div>
      </section>

      {/* A heartbeat, drawn as you arrive */}
      <EcgDivider />

      {/* Shorthand decoder */}
      <section className="pb-16 pt-10 lg:pb-24">
        <ShorthandTicker />
      </section>

      {/* Runtimes */}
      <section className="border-t border-border bg-muted/20 [content-visibility:auto] [contain-intrinsic-size:auto_640px]">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <Reveal className="flex flex-col gap-3">
            <Eyebrow>Two ways to run it</Eyebrow>
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              The big hosted models when you want them. Your own hardware when you
              don&apos;t.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:mt-12">
            <Reveal className="group flex flex-col gap-4 rounded-lg border border-border bg-background p-6 transition-colors hover:border-foreground/25 hover:bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border transition-colors group-hover:border-foreground/30">
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
            </Reveal>
            <Reveal
              delay={100}
              className="group flex flex-col gap-4 rounded-lg border border-border bg-background p-6 transition-colors hover:border-foreground/25 hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border transition-colors group-hover:border-foreground/30">
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
            </Reveal>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24 [content-visibility:auto] [contain-intrinsic-size:auto_560px]">
        <Reveal className="flex flex-col gap-3">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Three steps, and none of them is typing it up later.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3 lg:mt-12">
          <Reveal delay={0}>
            <Step n="01" icon={Mic} title="Capture">
              Record the consultation or paste a transcript. With live
              transcription on, the words show up as they are spoken.
            </Step>
          </Reveal>
          <Reveal delay={100}>
            <Step n="02" icon={Sparkles} title="Structure">
              Pick any model. NeoScribe turns the back-and-forth into complaints,
              history, examination, assessment, and plan.
            </Step>
          </Reveal>
          <Reveal delay={200}>
            <Step n="03" icon={Download} title="Export">
              Read it back, correct anything, and download a tidy note as PDF,
              Word, or Markdown to drop into the record.
            </Step>
          </Reveal>
        </div>
      </section>

      {/* By the numbers */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8 lg:pb-24">
        <Reveal className="mx-auto w-full max-w-4xl">
          <StatStrip />
        </Reveal>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/20 [content-visibility:auto] [contain-intrinsic-size:auto_560px]">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <Reveal className="flex flex-col gap-3">
            <Eyebrow>The details</Eyebrow>
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Opinionated where it counts, quiet everywhere else.
            </h2>
          </Reveal>
          <Reveal delay={100} className="mt-10 lg:mt-12">
            <FeatureGrid />
          </Reveal>
        </div>
      </section>

      {/* Privacy CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24 [content-visibility:auto] [contain-intrinsic-size:auto_480px]">
        <Reveal className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-6 overflow-hidden rounded-lg border border-border bg-background px-6 py-14 text-center sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_60%_at_50%_0%,black,transparent)]"
            style={{
              backgroundImage:
                "radial-gradient(hsl(var(--foreground) / 0.05) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <span className="flex h-12 w-12 items-center justify-center rounded-md border border-border">
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
            className="group inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open NeoScribe
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex flex-col gap-1">
            <span className="text-[14px] font-semibold tracking-tight text-foreground">
              NeoScribe
            </span>
            <span className="text-[12px] text-muted-foreground">
              A portfolio demo, not a medical device.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center transition-colors hover:text-foreground sm:min-h-0"
            >
              Dashboard
            </Link>
            <Link
              href="/scribe"
              className="inline-flex min-h-11 items-center transition-colors hover:text-foreground sm:min-h-0"
            >
              Scribe
            </Link>
            <Link
              href="/compare"
              className="inline-flex min-h-11 items-center transition-colors hover:text-foreground sm:min-h-0"
            >
              Compare
            </Link>
            <Link
              href="/models"
              className="inline-flex min-h-11 items-center transition-colors hover:text-foreground sm:min-h-0"
            >
              Models
            </Link>
            <Link
              href="/history"
              className="inline-flex min-h-11 items-center transition-colors hover:text-foreground sm:min-h-0"
            >
              History
            </Link>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            Hugging Face · Supabase · Vercel
          </p>
        </div>
      </footer>
    </div>
  );
}
