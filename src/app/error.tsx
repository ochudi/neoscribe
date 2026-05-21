"use client";

import { useEffect } from "react";

import { ErrorShell } from "@/components/system/ErrorShell";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[NeoScribe] route error:", error);
    }
  }, [error]);

  return (
    <ErrorShell
      code="500"
      title="Something broke on our side."
      description="An unexpected error came back from the server. You can try again, or head back to a known-good page."
      actions={[
        { label: "Try again", onClick: reset, variant: "primary" },
        { label: "Back to dashboard", href: "/", variant: "outline" },
      ]}
      digest={error.digest}
    />
  );
}
