"use client";

import { useEffect } from "react";

import { ErrorShell } from "@/components/system/ErrorShell";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function isNetworkError(err: Error) {
  const msg = err.message?.toLowerCase() ?? "";
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    msg.includes("connection") ||
    msg.includes("fetch")
  );
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[NeoScribe] route error:", error);
    }
  }, [error]);

  const network = isNetworkError(error);

  if (network) {
    return (
      <ErrorShell
        code="OFFLINE"
        eyebrow="Network"
        title="The model gateway didn't answer."
        description="We couldn't reach the NeoScribe API. This is usually transient — the gateway might be redeploying or your connection just dropped."
        suggestions={[
          "Check your internet connection.",
          "Wait a few seconds and retry — cold starts can take 15-30s.",
          "If it keeps failing, the gateway may be down.",
        ]}
        actions={[
          { label: "Try again", onClick: reset, variant: "primary" },
          { label: "Back to dashboard", href: "/", variant: "outline" },
        ]}
        digest={error.digest}
      />
    );
  }

  return (
    <ErrorShell
      code="500"
      eyebrow="Something broke"
      title="An unexpected error came back."
      description="The page hit an error it didn't know how to recover from. You can try again, or head back to the dashboard."
      suggestions={[
        "Retry — most errors here are transient.",
        "If it persists, send us the reference below.",
      ]}
      actions={[
        { label: "Try again", onClick: reset, variant: "primary" },
        { label: "Back to dashboard", href: "/", variant: "outline" },
      ]}
      digest={error.digest}
    />
  );
}
