"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Clock,
  Columns3,
  Play,
  type LucideIcon,
} from "lucide-react";

interface QuickstartCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

function QuickstartCard({
  href,
  icon: Icon,
  title,
  description,
}: QuickstartCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-md border border-border bg-background p-5 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted/40">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[16px] font-semibold leading-tight text-foreground">
          {title}
        </p>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

export function Quickstart() {
  return (
    <section className="flex flex-col gap-3">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Quickstart
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <QuickstartCard
          href="/chat"
          icon={Play}
          title="Start a new extraction"
          description="Paste a transcript and run it against a model."
        />
        <QuickstartCard
          href="/compare"
          icon={Columns3}
          title="Compare models"
          description="Run the same input across two or three models."
        />
        <QuickstartCard
          href="/history"
          icon={Clock}
          title="View history"
          description="Browse past runs and their full extractions."
        />
      </div>
    </section>
  );
}
