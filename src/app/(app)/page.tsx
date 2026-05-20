"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { PageContainer } from "@/components/layout/PageContainer";
import { ActiveModels } from "@/components/dashboard/ActiveModels";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { Quickstart } from "@/components/dashboard/Quickstart";
import { RecentRuns } from "@/components/dashboard/RecentRuns";
import { WelcomeStrip } from "@/components/dashboard/WelcomeStrip";
import {
  getDashboardStats,
  listModels,
  listRecentRuns,
} from "@/lib/api/client";

const USER_FIRST_NAME = "Chudi";

function StripSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="h-8 w-72 animate-pulse rounded bg-muted" />
      <div className="h-4 w-48 animate-pulse rounded bg-muted" />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-md border border-border bg-background p-4"
        >
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    refetchInterval: 30_000,
  });

  const { data: modelsData } = useQuery({
    queryKey: ["models"],
    queryFn: listModels,
    refetchInterval: 15_000,
  });

  const { data: runsData } = useQuery({
    queryKey: ["recent-runs"],
    queryFn: listRecentRuns,
    refetchInterval: 30_000,
  });

  const models = useMemo(() => modelsData ?? [], [modelsData]);
  const runs = useMemo(() => runsData ?? [], [runsData]);

  return (
    <PageContainer
      title="Dashboard"
      description="Overview of model health, recent runs, and system status."
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        {statsLoading || !stats ? (
          <StripSkeleton />
        ) : (
          <WelcomeStrip
            name={USER_FIRST_NAME}
            modelsOnline={stats.modelsOnline}
            extractionsToday={stats.extractionsToday}
          />
        )}

        {statsLoading || !stats ? <StatsSkeleton /> : <QuickStats stats={stats} />}

        <RecentRuns runs={runs} models={models} />

        <ActiveModels models={models} runs={runs} />

        <Quickstart />
      </div>
    </PageContainer>
  );
}
