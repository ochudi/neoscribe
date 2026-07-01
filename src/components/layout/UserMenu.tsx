"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/AuthProvider";

export function UserMenu() {
  const { user, role, signOut } = useAuth();
  const router = useRouter();
  if (!user) return null;

  const email = user.email ?? "";
  const initial = (email[0] ?? "?").toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-[13px] font-semibold text-foreground transition-colors hover:bg-muted/70"
          aria-label="Account menu"
          title={email}
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <div className="truncate text-[13px] font-medium text-foreground">
            {email}
          </div>
          {role ? (
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {role} account
            </div>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            router.replace("/");
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
