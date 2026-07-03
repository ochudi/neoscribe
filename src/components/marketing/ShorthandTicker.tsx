"use client";

/**
 * A slow marquee of clinical shorthand decoding itself, because that is
 * literally what the product does. Duplicated list + translateX(-50%) for a
 * seamless loop; pauses on hover; sits still under reduced motion.
 */
const PAIRS: Array<[string, string]> = [
  ["6/52", "6 weeks"],
  ["O/E", "on examination"],
  ["r/o", "rule out"],
  ["C/O", "complains of"],
  ["SOB", "shortness of breath"],
  ["2/7", "2 days"],
  ["Hx", "history"],
  ["PRN", "as needed"],
  ["NKDA", "no known drug allergies"],
  ["Rx", "treatment"],
  ["#", "fracture"],
  ["BP 120/80", "blood pressure, normal"],
];

function Row() {
  return (
    <div className="flex shrink-0 items-center gap-3 pr-3">
      {PAIRS.map(([short, long]) => (
        <span
          key={short}
          className="flex shrink-0 items-baseline gap-2 rounded-full border border-border bg-background px-3.5 py-1.5"
        >
          <span className="font-mono text-[12px] font-medium text-foreground">
            {short}
          </span>
          <span aria-hidden className="text-[11px] text-muted-foreground/60">
            →
          </span>
          <span className="text-[12px] text-muted-foreground">{long}</span>
        </span>
      ))}
    </div>
  );
}

export function ShorthandTicker() {
  return (
    <div className="flex flex-col gap-4">
      <p className="px-5 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:px-8">
        Fluent in clinical shorthand
      </p>
      <div
        className="group flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]"
        aria-label="Examples of clinical shorthand NeoScribe expands"
      >
        <div className="flex w-max motion-safe:animate-marquee motion-safe:group-hover:[animation-play-state:paused]">
          <Row />
          <Row />
        </div>
      </div>
    </div>
  );
}
