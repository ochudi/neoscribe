"use client";

import { useEffect, useState } from "react";

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
  const [greeting, setGreeting] = useState<string>("Welcome");

  useEffect(() => {
    setGreeting(greetingFor(new Date().getHours()));
  }, []);

  return (
    <section className="flex flex-col gap-1.5">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Dashboard
      </p>
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground sm:text-[28px]">
        {greeting}.
      </h1>
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
