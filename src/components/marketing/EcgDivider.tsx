"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * A full-width ECG trace that draws itself the first time it scrolls into
 * view, with one green pulse at the QRS spike. Pure SVG + CSS transitions.
 * Reduced motion renders it fully drawn and still.
 */
export function EcgDivider({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDrawn(true);
      setStill(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrawn(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  // One clean heartbeat: flatline, P wave, QRS complex, T wave, flatline.
  const trace =
    "M0,40 H240 q6,0 9,-6 t9,6 H320 l14,-28 14,52 12,-24 h60 q10,0 14,-8 t14,8 H800";

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("relative mx-auto w-full max-w-6xl px-5 sm:px-8", className)}
    >
      <svg
        viewBox="0 0 800 80"
        className="h-14 w-full sm:h-20"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
      >
        {/* faint resting trace, always visible so the space never looks empty */}
        <path d={trace} stroke="hsl(var(--border))" strokeWidth="1.5" />
        {/* the live trace draws over it */}
        <path
          d={trace}
          pathLength={1}
          stroke="hsl(var(--foreground) / 0.55)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1"
          strokeDashoffset={drawn ? "0" : "1"}
          style={{ transition: "stroke-dashoffset 2.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
        {/* green pulse at the QRS peak once the trace arrives */}
        <circle
          cx="348"
          cy="12"
          r="3"
          fill="#10A881"
          opacity={drawn ? 1 : 0}
          style={{ transition: "opacity 0.4s ease 1.1s" }}
        >
          {!still && (
            <animate
              attributeName="r"
              values="3;4.5;3"
              dur="2.4s"
              begin="1.4s"
              repeatCount="indefinite"
            />
          )}
        </circle>
      </svg>
    </div>
  );
}
