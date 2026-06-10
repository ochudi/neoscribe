"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listCloudModels } from "@/lib/api/client";
import { LOCAL_MODELS, type LocalModelDef } from "@/lib/local/catalog";
import {
  useLocalEngineStore,
  type LocalModelRuntime,
} from "@/lib/local/engine";
import {
  assessFit,
  getDeviceProfile,
  type DeviceProfile,
  type FitAssessment,
} from "@/lib/local/device";
import type { Model, ModelStatus } from "@/lib/api/types";

function localStatus(
  runtime: LocalModelRuntime | undefined,
  downloaded: boolean,
  fit: FitAssessment | null
): { status: ModelStatus; statusDetail: string } {
  if (fit?.verdict === "blocked") {
    return { status: "offline", statusDetail: "Not supported on this device" };
  }
  switch (runtime?.status) {
    case "downloading":
      return { status: "loading", statusDetail: "Downloading…" };
    case "loading":
      return { status: "loading", statusDetail: "Preparing…" };
    case "generating":
      return { status: "loading", statusDetail: "Generating…" };
    case "ready":
      return { status: "online", statusDetail: "Loaded in memory" };
    case "error":
      return { status: "offline", statusDetail: runtime.error ?? "Error" };
    default:
      return downloaded
        ? { status: "online", statusDetail: "Downloaded" }
        : { status: "available", statusDetail: "Tap to download" };
  }
}

export function useDeviceProfile(): DeviceProfile | null {
  const [profile, setProfile] = useState<DeviceProfile | null>(null);
  useEffect(() => {
    let mounted = true;
    getDeviceProfile().then((p) => {
      if (mounted) setProfile(p);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return profile;
}

function toModel(
  def: LocalModelDef,
  runtime: LocalModelRuntime | undefined,
  downloaded: boolean,
  profile: DeviceProfile | null
): Model {
  const fit = profile ? assessFit(def, profile) : null;
  const { status, statusDetail } = localStatus(runtime, downloaded, fit);
  return {
    id: def.id,
    name: def.name,
    runtime: "device",
    status,
    statusDetail,
    sizeLabel: def.sizeLabel,
    provider: def.provider,
    description: def.description,
    hfUrl: `https://huggingface.co/${def.hfId}`,
    downloadMb: fit?.downloadMb ?? def.downloadMb.webgpu,
    minRamGb: def.minRamGb,
    lastCheckedAt: new Date().toISOString(),
  };
}

/**
 * The full model list: cloud models from the API merged with the on-device
 * catalog, with live status for both.
 */
export function useModels() {
  const cloudQuery = useQuery({
    queryKey: ["models"],
    queryFn: listCloudModels,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const states = useLocalEngineStore((s) => s.states);
  const downloaded = useLocalEngineStore((s) => s.downloaded);
  const profile = useDeviceProfile();

  const models: Model[] = useMemo(() => {
    const cloud = cloudQuery.data ?? [];
    const local = LOCAL_MODELS.map((def) =>
      toModel(def, states[def.id], !!downloaded[def.id], profile)
    );
    return [...cloud, ...local];
  }, [cloudQuery.data, states, downloaded, profile]);

  return {
    models,
    cloudModels: models.filter((m) => m.runtime === "cloud"),
    deviceModels: models.filter((m) => m.runtime === "device"),
    isLoading: cloudQuery.isLoading,
    /** Cloud catalog fetch failed — on-device models still work. */
    cloudError: cloudQuery.error as Error | null,
    refetch: cloudQuery.refetch,
  };
}
