"use client";

import { useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface InputEditorProps {
  value: string;
  onChange: (next: string) => void;
  minHeight: number;
  placeholder: string;
}

export function InputEditor({
  value,
  onChange,
  minHeight,
  placeholder,
}: InputEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [scrollY, setScrollY] = useState(0);

  const lineCount = useMemo(
    () => Math.max(1, value.split("\n").length),
    [value]
  );
  const numbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1),
    [lineCount]
  );

  return (
    <div
      className="relative flex w-full overflow-hidden rounded-md border border-border bg-background"
      style={{ minHeight }}
    >
      <div
        aria-hidden="true"
        className="select-none overflow-hidden border-r border-border bg-muted/30 py-3"
        style={{ width: 40 }}
      >
        <div
          className="flex flex-col items-end pr-2 font-mono text-[12px] leading-[20px] text-muted-foreground"
          style={{ transform: `translateY(${-scrollY}px)` }}
        >
          {numbers.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>
      </div>

      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => setScrollY(e.currentTarget.scrollTop)}
        placeholder={placeholder}
        spellCheck={false}
        className={cn(
          "flex-1 resize-none overflow-auto bg-transparent px-3 py-3 font-mono text-[13px] leading-[20px] text-foreground placeholder:text-muted-foreground/70",
          "focus:outline-none"
        )}
      />

      <div className="pointer-events-none absolute bottom-2 right-3">
        <span className="font-mono text-[11px] text-muted-foreground">
          {value.length.toLocaleString()} chars
        </span>
      </div>
    </div>
  );
}
