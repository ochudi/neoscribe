"use client";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Sidebar />
      <main className="ml-60 pt-14">
        <div className="h-[calc(100vh-3.5rem)]">{children}</div>
      </main>
    </div>
  );
}
