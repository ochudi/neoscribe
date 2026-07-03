"use client";

import { useEffect, useRef } from "react";

const DOTS =
  "radial-gradient(hsl(var(--foreground) / 0.06) 1px, transparent 1px)";
const DOTS_BRIGHT =
  "radial-gradient(hsl(var(--foreground) / 0.22) 1px, transparent 1px)";

/**
 * The hero's dot-grid backdrop. A brighter copy of the grid is masked to a
 * circle that follows the cursor, so the dots quietly light up around the
 * pointer. Two CSS variables per pointermove, no animation loop; the bright
 * layer never appears on touch devices.
 */
export function HeroBackdrop() {
  const brightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bright = brightRef.current;
    const section = bright?.parentElement?.parentElement;
    if (!bright || !section) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      bright.style.setProperty("--hx", `${e.clientX - rect.left}px`);
      bright.style.setProperty("--hy", `${e.clientY - rect.top}px`);
      bright.style.opacity = "1";
    };
    const onLeave = () => {
      bright.style.opacity = "0";
    };

    section.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerleave", onLeave);
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(80%_60%_at_50%_25%,black,transparent)]"
    >
      {/* resting grid */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: DOTS, backgroundSize: "22px 22px" }}
      />
      {/* cursor-lit grid */}
      <div
        ref={brightRef}
        className="absolute inset-0 opacity-0 transition-opacity duration-500"
        style={{
          backgroundImage: DOTS_BRIGHT,
          backgroundSize: "22px 22px",
          WebkitMaskImage:
            "radial-gradient(170px circle at var(--hx, -300px) var(--hy, -300px), black, transparent 70%)",
          maskImage:
            "radial-gradient(170px circle at var(--hx, -300px) var(--hy, -300px), black, transparent 70%)",
        }}
      />
      {/* soft top glow, as before */}
      <div
        className="absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsl(var(--foreground) / 0.05), transparent)",
        }}
      />
    </div>
  );
}
