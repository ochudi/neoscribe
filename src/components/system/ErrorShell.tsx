"use client";

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export interface ErrorShellAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "outline" | "ghost";
}

interface ErrorShellProps {
  code: string;
  title: string;
  description: string;
  actions: ErrorShellAction[];
  digest?: string;
}

export function ErrorShell({
  code,
  title,
  description,
  actions,
  digest,
}: ErrorShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-md flex-col items-start gap-8">
        <div className="flex items-center gap-3">
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
        </div>

        <div className="flex flex-col gap-3">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            Error {code}
          </p>
          <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

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
