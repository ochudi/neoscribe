"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Clock,
  Columns3,
  LayoutGrid,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/compare", label: "Compare", icon: Columns3 },
  { href: "/models", label: "Models", icon: Boxes },
  { href: "/history", label: "History", icon: Clock },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed bottom-0 left-0 top-14 z-30 flex w-60 flex-col border-r border-border bg-background">
      <nav className="flex flex-col gap-0.5 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-md px-3 text-[14px] transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-3">
        <p className="font-mono text-[11px] text-muted-foreground">
          Powered by FastAPI · Vercel
        </p>
      </div>
    </aside>
  );
}
