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
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-border px-8 py-5">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-[14px] text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {disableScroll ? (
        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="px-8 py-6">{children}</div>
        </ScrollArea>
      )}
    </div>
  );
}
