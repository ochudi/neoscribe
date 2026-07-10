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
          className="flex flex-col gap-2.5 rounded-lg border border-border bg-background p-4 sm:p-5"
        >
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-[30px] w-16 animate-pulse rounded bg-muted sm:h-[34px]" />
          <div className="mt-auto border-t border-border/60 pt-2.5">
            <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RunsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />

      {/* Mobile: row-cards, matching RecentRuns' phone layout. */}
      <div className="flex flex-col gap-2 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2.5 rounded-lg border border-border bg-background p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-12 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3.5 w-10 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table shell, matching RecentRuns' header + row heights. */}
      <div className="hidden overflow-hidden rounded-lg border border-border bg-background md:block">
        <div className="h-[33px] border-b border-border bg-muted/30" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-border px-4 py-2.5 last:border-b-0"
          >
            <div className="h-5 w-full max-w-md animate-pulse rounded bg-muted" />
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
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:gap-10">
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
