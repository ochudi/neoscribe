"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

import { useReducedMotion } from "./useReducedMotion";

/** Stable bar heights so SSR and the first client paint agree. */
const WAVE = [
  22, 40, 64, 34, 72, 52, 88, 44, 60, 30, 76, 48, 92, 38, 58, 26, 70, 46, 82,
  36, 64, 28, 54, 74, 42, 66, 32, 80, 50, 24, 60, 44,
];

const PLAN_LINES = [
  "Admit for further evaluation and monitoring.",
  "Start empirical anti-tuberculous therapy pending results.",
  "Sputum for AFB, GeneXpert, and chest radiograph.",
  "Review with results in 48 hours.",
];

const FULL_PLAN = PLAN_LINES.join("\n");

/**
 * `enabled` = reduced-motion off (otherwise show the full plan, still).
 * `running` = the hero is actually on screen in a visible tab; when false the
 * typewriter freezes in place instead of burning a 34ms interval for nobody.
 */
function useTypewriter(enabled: boolean, running: boolean) {
  const [text, setText] = useState(enabled ? "" : FULL_PLAN);
  const pos = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setText(FULL_PLAN);
      return;
    }
    if (!running) return; // paused: keep current text, no timers

    let holding = false;
    let hold: number | undefined;

    const tick = () => {
      if (holding) return;
      pos.current += 1;
      if (pos.current > FULL_PLAN.length) {
        holding = true;
        hold = window.setTimeout(() => {
          pos.current = 0;
          holding = false;
          setText("");
        }, 2600);
        return;
      }
      setText(FULL_PLAN.slice(0, pos.current));
    };

    const id = window.setInterval(tick, 34);
    return () => {
      window.clearInterval(id);
      if (hold) window.clearTimeout(hold);
    };
  }, [enabled, running]);

  return text;
}

function useElapsed(running: boolean) {
  const [secs, setSecs] = useState(134); // 02:14, matches the old still

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** True while `ref` is in the viewport and the tab is visible. */
function useOnStage(ref: React.RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(node);

    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ref]);

  return inView && tabVisible;
}

function TrafficLights() {
  const dots = [
    { color: "#FF5F57", ring: "#E0443E", glyph: "×" },
    { color: "#FEBC2E", ring: "#DEA123", glyph: "−" },
    { color: "#28C840", ring: "#1AAB29", glyph: "+" },
  ];
  return (
    <span className="group/lights flex items-center gap-2">
      {dots.map((d) => (
        <span
          key={d.color}
          className="flex h-3 w-3 items-center justify-center rounded-full text-[8px] font-bold leading-none text-black/55 opacity-100 transition-transform duration-200 group-hover/lights:scale-110"
          style={{
            backgroundColor: d.color,
            boxShadow: `inset 0 0 0 0.5px ${d.ring}`,
          }}
        >
          <span className="opacity-0 transition-opacity duration-200 group-hover/lights:opacity-100">
            {d.glyph}
          </span>
        </span>
      ))}
    </span>
  );
}

export function HeroStage() {
  const reduced = useReducedMotion();
  const animate = !reduced;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  // gx/gy are pixel coordinates of the cursor within the stage; op is the
  // glow's opacity so it can fade in on enter and out on leave.
  const target = useRef({ rx: 0, ry: 0, gx: 0, gy: 0, op: 0 });
  const current = useRef({ rx: 0, ry: 0, gx: 0, gy: 0, op: 0 });

  const onStage = useOnStage(stageRef);
  const running = animate && onStage;

  const typed = useTypewriter(animate, running);
  const elapsed = useElapsed(running);

  useEffect(() => {
    if (!animate) {
      if (cardRef.current) cardRef.current.style.transform = "";
      return;
    }
    if (!running) return; // offscreen or hidden tab: no rAF work at all

    let raf = 0;
    const loop = () => {
      const c = current.current;
      const t = target.current;
      c.rx += (t.rx - c.rx) * 0.08;
      c.ry += (t.ry - c.ry) * 0.08;
      c.gx += (t.gx - c.gx) * 0.12;
      c.gy += (t.gy - c.gy) * 0.12;
      c.op += (t.op - c.op) * 0.1;

      if (cardRef.current) {
        cardRef.current.style.transform = `rotateX(${c.rx.toFixed(
          2
        )}deg) rotateY(${c.ry.toFixed(2)}deg)`;
      }
      if (glowRef.current) {
        // A big soft circle centred on the cursor. Because it fades to
        // transparent on its own radius, it never shows a rectangular edge.
        glowRef.current.style.transform = `translate3d(${(
          c.gx - 260
        ).toFixed(1)}px, ${(c.gy - 260).toFixed(1)}px, 0)`;
        glowRef.current.style.opacity = c.op.toFixed(3);
      }
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [animate, running]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!animate) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;
    const px = lx / rect.width;
    const py = ly / rect.height;
    // Kept gentle on purpose — the tilt should be felt, not noticed.
    target.current.ry = (px - 0.5) * 7;
    target.current.rx = (0.5 - py) * 7;
    target.current.gx = lx;
    target.current.gy = ly;
    target.current.op = 1;
  };

  const onPointerLeave = () => {
    target.current.rx = 0;
    target.current.ry = 0;
    target.current.op = 0;
  };

  return (
    <div
      ref={stageRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative w-full [perspective:1600px]"
    >
      {/* pointer-following ambient glow, drawn behind the window as a big
          soft circle so it fades out radially with no rectangular edge */}
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 -z-10 h-[520px] w-[520px] rounded-full opacity-0 blur-2xl will-change-transform"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--foreground) / 0.08), transparent 68%)",
        }}
      />

      <div
        ref={cardRef}
        className="relative rounded-lg border border-border bg-background shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_60px_-28px_rgba(0,0,0,0.28)] transition-shadow will-change-transform [transform-style:preserve-3d] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_28px_70px_-30px_rgba(0,0,0,0.7)]"
      >
        {/* title bar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 [transform:translateZ(30px)]">
          <span className="shrink-0">
            <TrafficLights />
          </span>
          <span className="ml-2 min-w-0 truncate font-mono text-[11px] text-muted-foreground">
            consultation.session
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-status-offline">
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute inline-flex h-2 w-2 rounded-full bg-status-offline/70 motion-safe:animate-pulse-ring" />
              <span className="relative h-2 w-2 rounded-full bg-status-offline" />
            </span>
            rec {elapsed}
          </span>
        </div>

        {/* waveform + sweeping playhead */}
        <div className="relative flex h-16 items-center gap-[3px] overflow-hidden border-b border-border px-4 [transform:translateZ(24px)]">
          {WAVE.map((h, i) => (
            <span
              key={i}
              className="w-full flex-1 origin-center rounded-full bg-status-online/70 motion-safe:animate-wave"
              style={{
                height: `${h}%`,
                animationDelay: `${(i % 8) * 0.09}s`,
                animationDuration: `${1 + (i % 5) * 0.12}s`,
              }}
            />
          ))}
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 h-full w-16 motion-safe:animate-sweep motion-reduce:hidden"
            style={{
              background:
                "linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.10), transparent)",
            }}
          />
        </div>

        {/* live transcript ticker */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2 [transform:translateZ(18px)]">
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            live
          </span>
          <p className="min-w-0 truncate text-[12px] text-muted-foreground">
            &ldquo;the cough has been there about six weeks, and I&rsquo;ve
            lost weight&rdquo;
          </p>
        </div>

        {/* structured note */}
        <div className="flex flex-col gap-4 p-5 [transform:translateZ(12px)]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-foreground">
              Clinical Note
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-status-online">
              <Check className="h-3 w-3" />
              structured
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Presenting complaint
            </span>
            <p className="text-[13px] leading-relaxed text-foreground/90">
              Productive cough for 6 weeks, with weight loss.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Assessment
            </span>
            <p className="text-[13px] leading-relaxed text-foreground/90">
              Working impression: pulmonary tuberculosis, rule out chest
              infection.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Plan
            </span>
            {/* The invisible full text reserves the final height, so the card
                never grows or shifts while the plan types itself out. */}
            <p className="relative whitespace-pre-line text-[13px] leading-relaxed text-foreground/90">
              <span aria-hidden className="invisible">
                {FULL_PLAN}
              </span>
              <span className="absolute inset-0 whitespace-pre-line">
                {typed}
                {animate && (
                  <span className="ml-0.5 inline-block h-[1.05em] w-[2px] -translate-y-[1px] bg-foreground/70 align-middle motion-safe:animate-caret" />
                )}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
