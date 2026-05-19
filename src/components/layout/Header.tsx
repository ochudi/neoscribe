"use client";

import Image from "next/image";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-3">
        <Image
          src="/plural-logo.svg"
          alt="Plural Health"
          width={24}
          height={24}
          className="text-foreground"
          priority
        />
        <span aria-hidden="true" className="h-5 w-px bg-border" />
        <div className="flex flex-col leading-none">
          <span className="text-[16px] font-medium text-foreground">
            NeoScribe
          </span>
          <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            v1.0.0 · Internal
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-online opacity-40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-status-online" />
          </span>
          <span className="font-mono text-[13px] text-foreground">
            All systems online
          </span>
        </div>

        <div
          className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-foreground"
          aria-label="User"
        >
          CO
        </div>
      </div>
    </header>
  );
}
