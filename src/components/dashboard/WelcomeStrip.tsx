"use client";

import { useEffect, useState } from "react";

function greetingFor(hour: number): string {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface WelcomeStripProps {
  name: string;
  modelsOnline: number;
  extractionsToday: number;
}

export function WelcomeStrip({
  name,
  modelsOnline,
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
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-foreground">
        {greeting}, {name}.
      </h1>
      <p className="text-[14px] text-muted-foreground">
        {modelsOnline} model{modelsOnline === 1 ? "" : "s"} online ·{" "}
        {extractionsToday} extraction{extractionsToday === 1 ? "" : "s"} today
      </p>
    </section>
  );
}
