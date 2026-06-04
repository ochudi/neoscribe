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
      eyebrow="Not found"
      title="That page isn't here."
      description="The URL you opened doesn't match anything in NeoScribe. It may have been renamed, never existed, or only lives in a future commit."
      suggestions={[
        "Double-check the spelling of the URL.",
        "Open the dashboard for a tour of what does exist.",
        "Try the model catalogue if you were heading there.",
      ]}
      actions={[
        { label: "Back to dashboard", href: "/", variant: "primary" },
        { label: "View models", href: "/models", variant: "outline" },
      ]}
    />
  );
}
