"use client";

import { useState } from "react";

function greetingFor(hour: number): string {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface WelcomeStripProps {
  modelsOnline: number;
  modelsTotal: number;
  extractionsToday: number;
}

export function WelcomeStrip({
  modelsOnline,
  modelsTotal,
  extractionsToday,
}: WelcomeStripProps) {
  // Time-of-day text can't match the prerendered HTML, so compute it once on
  // the client and let React keep whatever the server guessed until hydration.
  const [greeting] = useState<string>(() => greetingFor(new Date().getHours()));

  return (
    <section className="flex flex-col gap-1.5">
      {/* The page header already says "Dashboard" — this is the human line.
          <p>, not <h1>: PageContainer owns the page's single h1. */}
      <p
        suppressHydrationWarning
        className="text-[26px] font-semibold leading-tight tracking-tight text-foreground sm:text-[28px]"
      >
        {greeting}.
      </p>
      <p className="max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
        NeoScribe turns clinical conversations into structured findings —
        complaints, diagnoses, medications and more — and lets you compare how
        different AI models handle the same input.{" "}
        <span className="text-foreground">
          {modelsOnline} of {modelsTotal} cloud models online
        </span>
        {" · "}
        <span className="text-foreground">
          {extractionsToday} extraction{extractionsToday === 1 ? "" : "s"} today
        </span>
      </p>
    </section>
  );
}
