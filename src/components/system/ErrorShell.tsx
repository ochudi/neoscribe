"use client";

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorShellAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "outline" | "ghost";
}

interface ErrorShellProps {
  code: string;
  eyebrow?: string;
  title: string;
  description: string;
  suggestions?: string[];
  actions: ErrorShellAction[];
  digest?: string;
  /** Set false to suppress the giant background watermark on minimal pages. */
  watermark?: boolean;
}

export function ErrorShell({
  code,
  eyebrow,
  title,
  description,
  suggestions,
  actions,
  digest,
  watermark = true,
}: ErrorShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      {watermark ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span
            className={cn(
              "select-none font-mono font-bold leading-none tracking-tighter text-foreground/[0.04]",
              "text-[36vw] sm:text-[28vw] lg:text-[22vw]"
            )}
          >
            {code}
          </span>
        </div>
      ) : null}

      <div className="relative flex w-full max-w-lg flex-col items-start gap-8">
        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <Image
            src="/plural-icon.png"
            alt="Plural Health"
            width={28}
            height={28}
            className="rounded-sm"
            priority
          />
          <span aria-hidden="true" className="h-5 w-px bg-border" />
          <span className="text-[14px] font-medium text-foreground">
            NeoScribe
          </span>
        </Link>

        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow ?? `Error ${code}`}
          </p>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-foreground sm:text-[32px]">
            {title}
          </h1>
          <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        {suggestions && suggestions.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[14px] text-foreground"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-foreground/40"
                />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action, i) => {
            const variant =
              action.variant === "outline"
                ? "outline"
                : action.variant === "ghost"
                  ? "ghost"
                  : "default";
            if (action.href) {
              return (
                <Button key={i} asChild size="sm" variant={variant}>
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              );
            }
            return (
              <Button
                key={i}
                size="sm"
                variant={variant}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            );
          })}
        </div>

        {digest ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            Reference: <span className="text-foreground">{digest}</span>
          </p>
        ) : null}
      </div>
    </main>
  );
}
