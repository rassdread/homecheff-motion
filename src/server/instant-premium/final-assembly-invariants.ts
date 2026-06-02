import { createHash } from "node:crypto";
import type { FinalSegmentSourceKind } from "@/server/instant-premium/final-segment-source";
import {
  expectedAssemblySegmentCount,
  expectedTransitionRowCount,
  isStoryInstantMode,
} from "@/server/instant-premium/story-mode-transitions";

export const FINAL_ASSEMBLY_TRANSITION_COUNT_MISMATCH =
  "FINAL_ASSEMBLY_TRANSITION_COUNT_MISMATCH";
export const SEGMENT_TRIM_TOO_AGGRESSIVE = "SEGMENT_TRIM_TOO_AGGRESSIVE";

export class FinalAssemblyTransitionCountMismatchError extends Error {
  readonly code = FINAL_ASSEMBLY_TRANSITION_COUNT_MISMATCH;

  constructor(message: string) {
    super(message);
    this.name = "FinalAssemblyTransitionCountMismatchError";
  }
}

export class SegmentTrimTooAggressiveError extends Error {
  readonly code = SEGMENT_TRIM_TOO_AGGRESSIVE;

  constructor(message: string) {
    super(message);
    this.name = "SegmentTrimTooAggressiveError";
  }
}

export type TransitionRowForInvariant = {
  id: string;
  order: number;
  status: string;
  startImageId: string;
  endImageId: string;
  providerJobId: string | null;
  outputVideoUrl: string | null;
};

export type ImageRowForInvariant = {
  id: string;
  order: number;
};

/** @deprecated Use expectedTransitionRowCount or expectedAssemblySegmentCount. */
export function expectedTransitionCountForImageCount(
  imageCount: number,
  instantMode?: string | null
): number {
  if (instantMode !== undefined && instantMode !== null) {
    return expectedAssemblySegmentCount(imageCount, instantMode);
  }
  return expectedTransitionRowCount(imageCount);
}

export { expectedAssemblySegmentCount, expectedTransitionRowCount };

export function countCompletedTransitionsWithVideo(
  transitions: TransitionRowForInvariant[]
): number {
  return transitions.filter(
    (t) => t.status === "completed" && Boolean(t.outputVideoUrl?.trim())
  ).length;
}

export function assertFinalAssemblyTransitionInvariant(params: {
  projectId: string;
  images: ImageRowForInvariant[];
  transitions: TransitionRowForInvariant[];
  instantMode?: string | null;
}): void {
  const imageCount = params.images.length;
  const expectedRows = expectedTransitionRowCount(imageCount, params.instantMode);
  const transitionRowCount = params.transitions.length;

  if (isStoryInstantMode(params.instantMode)) {
    if (imageCount < 2) {
      throw new FinalAssemblyTransitionCountMismatchError(
        `[${params.projectId}] FINAL_ASSEMBLY_TRANSITION_COUNT_MISMATCH: story mode requires at least 2 images.`
      );
    }
    if (transitionRowCount !== expectedRows) {
      throw new FinalAssemblyTransitionCountMismatchError(
        `[${params.projectId}] FINAL_ASSEMBLY_TRANSITION_COUNT_MISMATCH: story multiframe expects ${expectedRows} transition row for ${imageCount} images; found ${transitionRowCount}.`
      );
    }
    const primary = params.transitions.find((t) => t.order === 0);
    const primaryReady =
      primary?.status === "completed" && Boolean(primary.outputVideoUrl?.trim());
    if (!primaryReady) {
      throw new FinalAssemblyTransitionCountMismatchError(
        `[${params.projectId}] FINAL_ASSEMBLY_TRANSITION_COUNT_MISMATCH: story mode requires one completed multiframe provider video.`
      );
    }
    return;
  }

  if (transitionRowCount !== expectedRows) {
    throw new FinalAssemblyTransitionCountMismatchError(
      `[${params.projectId}] FINAL_ASSEMBLY_TRANSITION_COUNT_MISMATCH: ${imageCount} images require ${expectedRows} transitions; found ${transitionRowCount} transition row(s).`
    );
  }

  const completedCount = countCompletedTransitionsWithVideo(params.transitions);
  if (completedCount !== expectedRows) {
    throw new FinalAssemblyTransitionCountMismatchError(
      `[${params.projectId}] FINAL_ASSEMBLY_TRANSITION_COUNT_MISMATCH: expected ${expectedRows} completed transitions with outputVideoUrl; got ${completedCount}.`
    );
  }
}

export type TransitionTableDebugRow = {
  index: number;
  id: string;
  order: number;
  status: string;
  startImageId: string;
  endImageId: string;
  outputVideoUrlPresent: boolean;
  providerJobId: string | null;
  durationSec?: number | null;
  sourceKind?: FinalSegmentSourceKind | string | null;
};

export function logTransitionTableDebug(params: {
  projectId: string;
  imageCount: number;
  expectedTransitionCount: number;
  transitions: TransitionTableDebugRow[];
}): void {
  console.info("[transition-table-debug]", {
    projectId: params.projectId,
    imageCount: params.imageCount,
    expectedTransitionCount: params.expectedTransitionCount,
    actualTransitionRowCount: params.transitions.length,
    transitions: params.transitions,
  });
}

export type FinalConcatInputDebugRow = {
  concatIndex: number;
  transitionId: string;
  transitionOrder: number;
  startImageId: string;
  endImageId: string;
  path: string;
  durationSec?: number;
  frameCount?: number;
  hash?: string;
};

export function logFinalConcatInputs(params: {
  projectId: string;
  expectedTransitionCount: number;
  actualConcatInputCount: number;
  concatInputs: FinalConcatInputDebugRow[];
}): void {
  console.info("[final-concat-inputs]", {
    projectId: params.projectId,
    expectedTransitionCount: params.expectedTransitionCount,
    actualConcatInputCount: params.actualConcatInputCount,
    concatInputs: params.concatInputs,
  });
}

export function assertFinalConcatInputCount(params: {
  projectId: string;
  expectedTransitionCount: number;
  actualConcatInputCount: number;
}): void {
  if (params.actualConcatInputCount !== params.expectedTransitionCount) {
    throw new FinalAssemblyTransitionCountMismatchError(
      `[${params.projectId}] FINAL_ASSEMBLY_TRANSITION_COUNT_MISMATCH: final concat expected ${params.expectedTransitionCount} inputs; got ${params.actualConcatInputCount}.`
    );
  }
}

export type ProviderChainDebug = {
  providerVideoUrl: string | null;
  downloadHash: string | null;
  concatHash: string | null;
  chainPreserved: boolean;
};

export type AdminAssemblyTransitionStatus = {
  label: string;
  transitionOrder: number;
  startImageId: string;
  endImageId: string;
  providerPresent: boolean;
  concatIncluded: boolean;
  providerVideoUrl?: string | null;
  downloadHash?: string | null;
  concatHash?: string | null;
  chainPreserved?: boolean;
  error?: string | null;
};

export type AdminFinalAssemblyReport = {
  imageCount: number;
  expectedTransitionCount: number;
  uploadedImages: Array<{ imageNumber: number; imageId: string; order: number }>;
  transitions: AdminAssemblyTransitionStatus[];
  allTransitionsPresent: boolean;
  allConcatIncluded: boolean;
  ok: boolean;
};

export function buildAdminFinalAssemblyReport(params: {
  images: ImageRowForInvariant[];
  transitions: TransitionRowForInvariant[];
  instantMode?: string | null;
  concatIncludedByTransitionId: Map<string, boolean>;
  providerChainByTransitionId?: Map<string, ProviderChainDebug>;
}): AdminFinalAssemblyReport {
  const sortedImages = [...params.images].sort((a, b) => a.order - b.order);
  const sortedTransitions = [...params.transitions].sort((a, b) => a.order - b.order);
  const expected = expectedTransitionRowCount(
    sortedImages.length,
    params.instantMode
  );

  const transitionStatuses: AdminAssemblyTransitionStatus[] = sortedTransitions.map((t) => {
    const startNum =
      sortedImages.findIndex((img) => img.id === t.startImageId) + 1 || t.order + 1;
    const endNum = sortedImages.findIndex((img) => img.id === t.endImageId) + 1 || t.order + 2;
    const providerPresent = t.status === "completed" && Boolean(t.outputVideoUrl?.trim());
    const concatIncluded = params.concatIncludedByTransitionId.get(t.id) ?? false;
    const chain = params.providerChainByTransitionId?.get(t.id);
    const chainPreserved = chain?.chainPreserved ?? (providerPresent && concatIncluded);
    let error: string | null = null;
    if (!providerPresent) {
      error = "missing_provider_video";
    } else if (!concatIncluded) {
      error = "missing_from_final_concat";
    } else if (!chainPreserved) {
      error = "provider_download_concat_chain_broken";
    }
    return {
      label: `${startNum}→${endNum}`,
      transitionOrder: t.order,
      startImageId: t.startImageId,
      endImageId: t.endImageId,
      providerPresent,
      concatIncluded,
      providerVideoUrl: chain?.providerVideoUrl ?? t.outputVideoUrl,
      downloadHash: chain?.downloadHash ?? null,
      concatHash: chain?.concatHash ?? null,
      chainPreserved,
      error,
    };
  });

  const allTransitionsPresent = transitionStatuses.every((row) => row.providerPresent);
  const allConcatIncluded =
    transitionStatuses.length === expected &&
    transitionStatuses.every((row) => row.concatIncluded);
  const allChainsPreserved = transitionStatuses.every((row) => row.chainPreserved);

  return {
    imageCount: sortedImages.length,
    expectedTransitionCount: expected,
    uploadedImages: sortedImages.map((img, idx) => ({
      imageNumber: idx + 1,
      imageId: img.id,
      order: img.order,
    })),
    transitions: transitionStatuses,
    allTransitionsPresent,
    allConcatIncluded,
    ok: allTransitionsPresent && allConcatIncluded && allChainsPreserved,
  };
}

export function buildProviderChainByTransitionId(params: {
  transitions: TransitionRowForInvariant[];
  storageSha256ByTransitionId?: Map<string, string | null>;
  rebuildSegmentTraces: Array<{
    transitionId: string;
    downloadedFileHash?: string;
    concatInputHash?: string;
  }>;
}): Map<string, ProviderChainDebug> {
  const map = new Map<string, ProviderChainDebug>();
  for (const transition of params.transitions) {
    const trace = params.rebuildSegmentTraces.find((s) => s.transitionId === transition.id);
    const downloadHash =
      trace?.downloadedFileHash ??
      params.storageSha256ByTransitionId?.get(transition.id) ??
      null;
    const concatHash = trace?.concatInputHash ?? null;
    const providerVideoUrl = transition.outputVideoUrl?.trim() ?? null;
    const providerPresent =
      transition.status === "completed" && Boolean(providerVideoUrl);
    const chainPreserved =
      providerPresent &&
      Boolean(downloadHash) &&
      (!concatHash || concatHash === downloadHash);
    map.set(transition.id, {
      providerVideoUrl,
      downloadHash,
      concatHash,
      chainPreserved,
    });
  }
  return map;
}

export function hashUrlShort(url: string): string {
  return createHash("sha256").update(url.trim()).digest("hex").slice(0, 16);
}

export function buildConcatIncludedByTransitionId(params: {
  transitions: TransitionRowForInvariant[];
  rebuildSegmentTraces: Array<{ transitionId: string; concatInputPath?: string | null }>;
  latestExportCompleted: boolean;
}): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const transition of params.transitions) {
    const trace = params.rebuildSegmentTraces.find((s) => s.transitionId === transition.id);
    if (trace?.concatInputPath?.trim()) {
      map.set(transition.id, true);
      continue;
    }
    if (trace && !trace.concatInputPath?.trim()) {
      map.set(transition.id, false);
      continue;
    }
    const providerReady =
      transition.status === "completed" && Boolean(transition.outputVideoUrl?.trim());
    map.set(transition.id, params.latestExportCompleted && providerReady);
  }
  return map;
}
