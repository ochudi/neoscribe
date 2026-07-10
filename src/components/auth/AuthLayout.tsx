"use client";

import Link from "next/link";

import { BrandMark } from "@/components/brand/BrandMark";
import { EcgDivider } from "@/components/marketing/EcgDivider";
import { HeroBackdrop } from "@/components/marketing/HeroBackdrop";

function Wordmark() {
  return (
    <Link href="/" className="flex min-h-11 w-fit items-center gap-2.5">
      <BrandMark size={26} />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          NeoScribe
        </span>
        <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          Clinical AI playground
        </span>
      </span>
    </Link>
  );
}

/**
 * Auth shell. On phones and tablets it stays a quiet centered form; at lg+
 * it splits into a brand rail (dot grid, display statement, ECG trace) and
 * the form column, so signing in feels like the same product as the landing.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Brand rail, lg+ only */}
      <aside className="relative isolate hidden overflow-hidden border-r border-border bg-muted/20 lg:flex lg:flex-col lg:justify-between lg:gap-16 lg:p-10 xl:p-14">
        <HeroBackdrop />

        <Wordmark />

        <div className="flex max-w-md flex-col gap-5">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            NeoScribe · clinical documentation
          </span>
          <p className="text-3xl font-semibold leading-[1.1] tracking-tight text-foreground xl:text-4xl">
            Record the consult.
            <br />
            NeoScribe writes the note.
          </p>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Your transcripts, notes, and model runs, kept in one place and
            ready on any device you sign in from.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <EcgDivider className="max-w-none px-0 sm:px-0" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span className="absolute inline-flex h-2 w-2 rounded-full bg-status-online/70 motion-safe:animate-pulse-ring" />
                <span className="relative h-2 w-2 rounded-full bg-status-online" />
              </span>
              On-device by default
            </span>
            <span className="h-3 w-px bg-border" />
            <span>PDF · Word · Markdown</span>
          </div>
        </div>
      </aside>

      {/* Form column */}
      <div className="flex min-h-dvh flex-col">
        <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-5 sm:px-8 lg:hidden">
          <Wordmark />
        </header>

        <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
          <div className="w-full max-w-sm">
            <div className="flex flex-col gap-1.5 motion-safe:animate-fade-up">
              <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="text-[14px] text-muted-foreground">{subtitle}</p>
            </div>
            <div
              className="mt-6 motion-safe:animate-fade-up"
              style={{ animationDelay: "75ms" }}
            >
              {children}
            </div>
            <div
              className="mt-6 text-center text-[13px] text-muted-foreground motion-safe:animate-fade-up"
              style={{ animationDelay: "150ms" }}
            >
              {footer}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
