"use client";

import Image from "next/image";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <span className="h-9 w-9" aria-hidden="true" />;
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={
        "sticky top-0 z-40 border-b transition-colors " +
        (scrolled
          ? "border-border bg-background/85 backdrop-blur"
          : "border-transparent bg-transparent")
      }
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/plural-icon.png"
            alt="Plural Health"
            width={26}
            height={26}
            className="rounded-sm"
            priority
          />
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold leading-tight tracking-tight text-foreground">
              NeoScribe
            </span>
            <span className="mt-1 font-mono text-[9px] uppercase leading-none tracking-[0.18em] text-muted-foreground">
              Plural Health
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/login"
            className="hidden rounded-md px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Sign in
          </Link>
          <ThemeToggle />
          <Link
            href="/signup"
            className="inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:px-4"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
