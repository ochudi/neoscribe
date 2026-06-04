"use client";

import Image from "next/image";
import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border bg-background px-3 sm:px-4 print:hidden">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        <Image
          src="/plural-icon.png"
          alt="Plural Health"
          width={24}
          height={24}
          className="rounded-sm"
          priority
        />
        <span aria-hidden="true" className="hidden h-5 w-px bg-border sm:block" />
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-medium text-foreground sm:text-[16px]">
            NeoScribe
          </span>
          <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:mt-1">
            v1.0.0 · Internal
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="flex items-center gap-2 rounded-full border border-border py-1 pl-2 pr-2 sm:px-3"
          aria-label="System status"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-online opacity-40" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-status-online" />
          </span>
          <span className="hidden font-mono text-[13px] text-foreground sm:inline">
            All systems online
          </span>
          <span className="font-mono text-[11px] text-foreground sm:hidden">
            Online
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
