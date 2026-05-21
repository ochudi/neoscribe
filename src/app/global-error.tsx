"use client";

import { useEffect } from "react";
import { Inter } from "next/font/google";

import { ErrorShell } from "@/components/system/ErrorShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[NeoScribe] global error:", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className={inter.variable}>
        <ErrorShell
          code="500"
          title="The app couldn't start."
          description="A fatal error stopped NeoScribe from loading. Reload to try again — if it persists, send the reference below to the team."
          actions={[
            { label: "Reload", onClick: reset, variant: "primary" },
          ]}
          digest={error.digest}
        />
      </body>
    </html>
  );
}
