"use client";

import { Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/brand/BrandMark";
import { UserMenu } from "@/components/layout/UserMenu";
import { useModels } from "@/lib/hooks/useModels";
import { cn } from "@/lib/utils";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className="h-9 w-9" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground ring-offset-background transition-colors after:absolute after:-inset-1 after:content-[''] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function StatusPill() {
  const { cloudModels, isLoading, cloudError } = useModels();

  const online = cloudModels.filter((m) => m.status === "online").length;
  const total = cloudModels.length;

  let dotClass = "bg-status-online";
  let text = `${online}/${total} cloud models online`;
  let shortText = "Online";

  if (isLoading) {
    dotClass = "bg-status-loading";
    text = "Checking models…";
    shortText = "…";
  } else if (cloudError) {
    dotClass = "bg-status-offline";
    text = "Cloud models unreachable";
    shortText = "Offline";
  } else if (total > 0 && online < total) {
    dotClass = "bg-status-loading";
  }

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border py-1 pl-2 pr-2 sm:px-3"
      aria-label="Model availability"
      title="Live availability of the cloud model catalog"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-40 motion-safe:animate-ping",
            dotClass
          )}
        />
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dotClass)} />
      </span>
      <span className="hidden font-mono text-[12px] text-foreground sm:inline">
        {text}
      </span>
      <span className="font-mono text-[11px] text-foreground sm:hidden">
        {shortText}
      </span>
    </div>
  );
}

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
          className="relative -ml-1 flex h-9 w-9 items-center justify-center rounded-md text-foreground ring-offset-background transition-colors after:absolute after:-inset-1 after:content-[''] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        <BrandMark size={24} />
        <span aria-hidden="true" className="hidden h-5 w-px bg-border sm:block" />
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-medium text-foreground sm:text-[16px]">
            NeoScribe
          </span>
          <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:mt-1">
            Clinical AI playground
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <StatusPill />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
