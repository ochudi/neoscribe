"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Clock,
  Columns3,
  FileText,
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
  { href: "/scribe", label: "Scribe", icon: FileText },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/compare", label: "Compare", icon: Columns3 },
  { href: "/models", label: "Models", icon: Boxes },
  { href: "/history", label: "History", icon: Clock },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavListProps {
  onNavigate?: () => void;
  size?: "compact" | "comfortable";
}

export function NavList({ onNavigate, size = "compact" }: NavListProps) {
  const pathname = usePathname();
  const heightClass = size === "comfortable" ? "h-11" : "h-9";
  const fontClass = size === "comfortable" ? "text-[15px]" : "text-[14px]";

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 transition-colors",
              heightClass,
              fontClass,
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
  );
}

export function SidebarFooter() {
  return (
    <div className="mt-auto p-3">
      <p className="font-mono text-[11px] text-muted-foreground">
        Hugging Face · Supabase · Vercel
      </p>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed bottom-0 left-0 top-14 z-30 hidden w-60 flex-col border-r border-border bg-background print:hidden lg:flex">
      <NavList />
      <SidebarFooter />
    </aside>
  );
}
