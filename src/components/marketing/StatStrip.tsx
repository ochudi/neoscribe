"use client";

import { useEffect, useRef, useState } from "react";

interface Stat {
  value: number;
  suffix?: string;
  label: string;
}

const STATS: Stat[] = [
  { value: 16, label: "models, one input" },
  { value: 3, label: "export formats" },
  { value: 100, suffix: "%", label: "of transcription on-device" },
  { value: 0, label: "audio files uploaded" },
];

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Numbers count up (and, for the zero, wind down) the first time the strip
 * scrolls into view. Reduced motion shows final values immediately.
 */
export function StatStrip() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const DURATION = 1300;
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION);
          setProgress(easeOut(t));
          if (t < 1) raf = window.requestAnimationFrame(step);
        };
        raf = window.requestAnimationFrame(step);
      },
      { threshold: 0.5 }
    );
    io.observe(node);
    return () => {
      io.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4"
    >
      {STATS.map((s) => {
        // Zero winds DOWN from 9 to land on 0 — the joke lands harder.
        const shown =
          s.value === 0
            ? Math.round(9 * (1 - progress))
            : Math.round(s.value * progress);
        return (
          <div key={s.label} className="flex flex-col items-center gap-1.5 text-center">
            <span className="font-mono text-[34px] font-semibold leading-none tracking-tight text-foreground tabular-nums sm:text-[40px]">
              {shown}
              {s.suffix ?? ""}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
