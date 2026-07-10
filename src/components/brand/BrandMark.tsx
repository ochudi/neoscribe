import { cn } from "@/lib/utils";

/**
 * NeoScribe monogram — an "N" drawn as a single pen stroke inside a rounded
 * tile. Inverts with the theme (tile follows `foreground`, stroke follows
 * `background`).
 */
export function BrandMark({
  size = 26,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-foreground" />
      <path
        d="M10 22.5V9.5L22 22.5V9.5"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-background"
      />
    </svg>
  );
}
