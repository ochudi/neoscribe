"use client";

import { useEffect } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";

interface PageContainerProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /**
   * When true, the body is rendered without an outer ScrollArea or padding —
   * the page is responsible for its own internal scrolling. Useful for
   * multi-column layouts where each column scrolls independently.
   */
  disableScroll?: boolean;
}

export function PageContainer({
  title,
  description,
  actions,
  children,
  disableScroll = false,
}: PageContainerProps) {
  useEffect(() => {
    document.title = `${title} · NeoScribe`;
  }, [title]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 motion-safe:animate-fade-up sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold leading-tight tracking-tight text-foreground sm:text-[24px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-[13px] text-muted-foreground sm:text-[14px]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      {/* Body eases in a beat after the header — one quiet, app-wide entrance. */}
      {disableScroll ? (
        <div
          className="min-h-0 flex-1 overflow-hidden motion-safe:animate-fade-up"
          style={{ animationDelay: "75ms" }}
        >
          {children}
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div
            className="px-4 py-5 motion-safe:animate-fade-up sm:px-6 sm:py-6 lg:px-8"
            style={{ animationDelay: "75ms" }}
          >
            {children}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
