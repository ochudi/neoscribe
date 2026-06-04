"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Header } from "@/components/layout/Header";
import { NavList, Sidebar, SidebarFooter } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on any route change.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setNavOpen(true)} />
      <Sidebar />

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle className="text-left text-[15px] font-medium">
              NeoScribe
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col">
            <NavList
              size="comfortable"
              onNavigate={() => setNavOpen(false)}
            />
            <SidebarFooter />
          </div>
        </SheetContent>
      </Sheet>

      <main className="pt-14 print:ml-0 print:pt-0 lg:ml-60">
        <div className="h-[calc(100vh-3.5rem)] print:h-auto">{children}</div>
      </main>
    </div>
  );
}
