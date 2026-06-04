"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { PageContainer } from "@/components/layout/PageContainer";
import { ModelRail } from "@/components/chat/ModelRail";
import { CenterColumn } from "@/components/chat/CenterColumn";
import { MetadataRail } from "@/components/chat/MetadataRail";
import { listModels } from "@/lib/api/client";
import { useChatStore } from "@/lib/stores/chatStore";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const modelParam = searchParams.get("model");
  const setSelectedModelId = useChatStore((s) => s.setSelectedModelId);

  const { data: models } = useQuery({
    queryKey: ["models"],
    queryFn: listModels,
    refetchInterval: 15_000,
  });

  // Honour `?model=<id>` from links into the page.
  useEffect(() => {
    if (!modelParam || !models) return;
    if (models.some((m) => m.id === modelParam)) {
      setSelectedModelId(modelParam);
    }
  }, [modelParam, models, setSelectedModelId]);

  return (
    <PageContainer
      title="Chat"
      description="Run a transcript through a model and inspect the extraction."
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
