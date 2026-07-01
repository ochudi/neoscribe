"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/components/providers/AuthProvider";

function FullScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Redirects to /login when signed out. If auth isn't configured, lets the app
 *  through so the tool still works during setup. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading, configured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !configured) return;
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, configured, session, pathname, router]);

  if (!configured) return <>{children}</>;
  if (loading || !session) return <FullScreen />;
  return <>{children}</>;
}
