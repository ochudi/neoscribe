"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { ModelRail } from "@/components/chat/ModelRail";
import { CenterColumn } from "@/components/chat/CenterColumn";
import { MetadataRail } from "@/components/chat/MetadataRail";
import { useModels } from "@/lib/hooks/useModels";
import { useChatStore } from "@/lib/stores/chatStore";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const modelParam = searchParams.get("model");
  const setSelectedModelId = useChatStore((s) => s.setSelectedModelId);

  const { models } = useModels();

  // Honour `?model=<id>` from links into the page.
  useEffect(() => {
    if (!modelParam || models.length === 0) return;
    if (models.some((m) => m.id === modelParam)) {
      setSelectedModelId(modelParam);
    }
  }, [modelParam, models, setSelectedModelId]);

  return (
    <PageContainer
      title="Workspace"
      description="Run a transcript through one model and inspect what it found."
      disableScroll
    >
      <div className="flex h-full">
        <ModelRail />
        <CenterColumn />
        <MetadataRail />
      </div>
    </PageContainer>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageContent />
    </Suspense>
  );
}
