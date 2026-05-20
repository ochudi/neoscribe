"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { ModelRail } from "@/components/chat/ModelRail";
import { CenterColumn } from "@/components/chat/CenterColumn";
import { MetadataRail } from "@/components/chat/MetadataRail";

export default function ChatPage() {
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
