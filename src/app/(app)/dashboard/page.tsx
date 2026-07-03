"use client";

import { useQuery } from "@tanstack/react-query";

import { PageContainer } from "@/components/layout/PageContainer";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { Quickstart } from "@/components/dashboard/Quickstart";
import { RecentRuns } from "@/components/dashboard/RecentRuns";
import { WelcomeStrip } from "@/components/dashboard/WelcomeStrip";
import { getDashboardStats, listRuns } from "@/lib/api/client";

function StripSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-8 w-72 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full max-w-xl animate-pulse rounded bg-muted" />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4"
        >
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function RunsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="h-8 border-b border-border bg-muted/30" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-border px-4 py-3 last:border-b-0"
          >
            <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    refetchInterval: 30_000,
  });

  const { data: runs, isLoading: runsLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: () => listRuns(50),
    refetchInterval: 30_000,
  });

  return (
    <PageContainer
      title="Dashboard"
      description="What's running, what just ran, and where to start."
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        {statsLoading || !stats ? (
          <StripSkeleton />
        ) : (
          <WelcomeStrip
            modelsOnline={stats.modelsOnline}
            modelsTotal={stats.modelsTotal}
            extractionsToday={stats.extractionsToday}
          />
        )}

        {statsLoading || !stats ? <StatsSkeleton /> : <QuickStats stats={stats} />}

        <Quickstart />

        {runsLoading ? <RunsSkeleton /> : <RecentRuns runs={runs ?? []} />}
      </div>
    </PageContainer>
  );
}
