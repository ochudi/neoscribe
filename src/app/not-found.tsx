import type { Metadata } from "next";

import { ErrorShell } from "@/components/system/ErrorShell";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <ErrorShell
      code="404"
      title="This page hasn't been written yet."
      description="The URL you opened doesn't match any page in NeoScribe. It may have been renamed, never existed, or only lives in a future commit."
      actions={[
        { label: "Back to dashboard", href: "/", variant: "primary" },
        { label: "Open chat", href: "/chat", variant: "outline" },
      ]}
    />
  );
}
