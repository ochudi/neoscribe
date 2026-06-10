import type { LocalModelDef } from "@/lib/local/catalog";

export interface DeviceProfile {
  /** WebGPU adapter actually obtainable, not just `navigator.gpu` present. */
  webgpu: boolean;
  /** Reported RAM in GB (Chrome/Edge only, capped at 8). null = unknown. */
  ramGb: number | null;
  cores: number | null;
  isMobile: boolean;
  /** Free origin storage in MB. null = unknown. */
  storageFreeMb: number | null;
}

let profilePromise: Promise<DeviceProfile> | null = null;

async function detect(): Promise<DeviceProfile> {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: { mobile?: boolean };
    gpu?: { requestAdapter(): Promise<unknown | null> };
  };

  let webgpu = false;
  try {
    if (nav.gpu) {
      const adapter = await nav.gpu.requestAdapter();
      webgpu = adapter !== null;
    }
  } catch {
    webgpu = false;
  }

  let storageFreeMb: number | null = null;
  try {
    if (navigator.storage?.estimate) {
      const { quota, usage } = await navigator.storage.estimate();
      if (typeof quota === "number") {
        storageFreeMb = Math.max(0, (quota - (usage ?? 0)) / 1024 / 1024);
      }
    }
  } catch {
    storageFreeMb = null;
  }

  const isMobile =
    nav.userAgentData?.mobile ??
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  return {
    webgpu,
    ramGb: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    cores:
      typeof navigator.hardwareConcurrency === "number"
        ? navigator.hardwareConcurrency
        : null,
    isMobile,
    storageFreeMb,
  };
}

export function getDeviceProfile(): Promise<DeviceProfile> {
  if (!profilePromise) profilePromise = detect();
  return profilePromise;
}

export type FitVerdict = "good" | "slow" | "blocked";

export interface FitAssessment {
  verdict: FitVerdict;
  /** Backend that will be used on this device. */
  backend: "webgpu" | "wasm";
  backendLabel: string;
  downloadMb: number;
  minRamGb: number;
  /** Plain-English notes explaining the verdict. */
  notes: string[];
}

/**
 * Decide how well a local model fits this device, with honest plain-English
 * reasons. "blocked" means we refuse to run it (it would crash or hang).
 */
export function assessFit(model: LocalModelDef, p: DeviceProfile): FitAssessment {
  const backend: "webgpu" | "wasm" = p.webgpu ? "webgpu" : "wasm";
  const downloadMb = model.downloadMb[backend];
  const notes: string[] = [];
  let verdict: FitVerdict = "good";

  if (model.webgpuOnly && !p.webgpu) {
    return {
      verdict: "blocked",
      backend,
      backendLabel: "CPU (WebAssembly)",
      downloadMb,
      minRamGb: model.minRamGb,
      notes: [
        "This model needs GPU acceleration (WebGPU), which this browser doesn't offer. On the CPU fallback it would be far too slow to be usable.",
        "Recent Chrome, Edge, or Safari on a laptop or desktop supports WebGPU. Or pick one of the smaller on-device models — they run fine on CPU.",
      ],
    };
  }

  if (p.ramGb !== null && p.ramGb < model.minRamGb) {
    return {
      verdict: "blocked",
      backend,
      backendLabel: backend === "webgpu" ? "GPU (WebGPU)" : "CPU (WebAssembly)",
      downloadMb,
      minRamGb: model.minRamGb,
      notes: [
        `This model needs roughly ${model.minRamGb} GB of memory, but this device reports ${p.ramGb} GB. Loading it would very likely crash the tab.`,
        "Try one of the smaller on-device models instead.",
      ],
    };
  }

  if (p.storageFreeMb !== null && p.storageFreeMb < downloadMb + 100) {
    return {
      verdict: "blocked",
      backend,
      backendLabel: backend === "webgpu" ? "GPU (WebGPU)" : "CPU (WebAssembly)",
      downloadMb,
      minRamGb: model.minRamGb,
      notes: [
        `The download needs about ${Math.ceil(downloadMb)} MB of browser storage, but only ~${Math.floor(p.storageFreeMb)} MB is free.`,
        "Free up space (or remove another downloaded model) and try again.",
      ],
    };
  }

  if (!p.webgpu) {
    notes.push(
      "This browser has no GPU acceleration (WebGPU), so the model will run on the CPU."
    );
    if (model.paramsB >= 0.5) {
      verdict = "slow";
      notes.push(
        "At this model size that usually means well under one word per second — fine to try, but be patient."
      );
    }
  }

  if (p.isMobile && !model.phoneFriendly) {
    verdict = "slow";
    notes.push(
      "You appear to be on a phone or tablet. This model is on the heavy side for mobile devices — it should work on recent flagships, but may be slow or run out of memory on older ones."
    );
  }

  if (p.ramGb === null) {
    notes.push(
      "This browser doesn't report its memory, so we can't pre-check RAM. If the tab reloads during loading, the model was too big for this device."
    );
  }

  if (verdict === "good") {
    notes.unshift("This device looks like a good fit for this model.");
  }

  return {
    verdict,
    backend,
    backendLabel: backend === "webgpu" ? "GPU (WebGPU)" : "CPU (WebAssembly)",
    downloadMb,
    minRamGb: model.minRamGb,
    notes,
  };
}

export function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}
