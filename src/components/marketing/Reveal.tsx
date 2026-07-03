"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger, in ms, before this element eases in once it enters the viewport. */
  delay?: number;
}

/**
 * Fades and lifts its children into place the first time they scroll into
 * view. Honours reduced-motion by rendering fully visible from the start.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={cn(
        "motion-safe:transition-all motion-safe:[transition-duration:900ms] motion-safe:[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
        shown
          ? "translate-y-0 opacity-100 blur-0"
          : "motion-safe:translate-y-6 motion-safe:opacity-0 motion-safe:blur-[2px]",
        className
      )}
    >
      {children}
    </div>
  );
}
