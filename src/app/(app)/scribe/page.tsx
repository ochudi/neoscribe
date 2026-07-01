"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { ScribeWorkspace } from "@/components/scribe/ScribeWorkspace";

function ScribePageContent() {
  const searchParams = useSearchParams();
  const modelParam = searchParams.get("model") ?? undefined;

  return (
    <PageContainer
      title="Scribe"
      description="Turn a consultation transcript into a structured clinical note — then download it as PDF, Word, or Markdown."
    >
      <ScribeWorkspace initialModelId={modelParam} />
    </PageContainer>
  );
}

export default function ScribePage() {
  return (
    <Suspense fallback={null}>
      <ScribePageContent />
    </Suspense>
  );
}
