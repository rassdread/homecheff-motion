import { createHash } from "node:crypto";
import type { FinalSegmentSourceKind } from "@/server/instant-premium/final-segment-source";

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

export function expectedTransitionCountForImageCount(imageCount: number): number {
  return Math.max(0, imageCount - 1);
}

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
}): void {
  const imageCount = params.images.length;
  const expected = expectedTransitionCountForImageCount(imageCount);
  const transitionRowCount = params.transitions.length;
  const completedCount = countCompletedTransitionsWithVideo(params.transitions);

  if (transitionRowCount !== expected) {
    throw new FinalAssemblyTransitionCountMismatchError(
      `[${params.projectId}] FINAL_ASSEMBLY_TRANSITION_COUNT_MISMATCH: ${imageCount} images require ${expected} transitions; found ${transitionRowCount} transition row(s).`
    );
  }
  if (completedCount !== expected) {
    throw new FinalAssemblyTransitionCountMismatchError(
      `[${params.projectId}] FINAL_ASSEMBLY_TRANSITION_COUNT_MISMATCH: expected ${expected} completed transitions with outputVideoUrl; got ${completedCount}.`
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

export type AdminAssemblyTransitionStatus = {
  label: string;
  transitionOrder: number;
  startImageId: string;
  endImageId: string;
  providerPresent: boolean;
  concatIncluded: boolean;
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
  concatIncludedByTransitionId: Map<string, boolean>;
}): AdminFinalAssemblyReport {
  const sortedImages = [...params.images].sort((a, b) => a.order - b.order);
  const sortedTransitions = [...params.transitions].sort((a, b) => a.order - b.order);
  const expected = expectedTransitionCountForImageCount(sortedImages.length);

  const transitionStatuses: AdminAssemblyTransitionStatus[] = sortedTransitions.map((t) => {
    const startNum =
      sortedImages.findIndex((img) => img.id === t.startImageId) + 1 || t.order + 1;
    const endNum = sortedImages.findIndex((img) => img.id === t.endImageId) + 1 || t.order + 2;
    const providerPresent = t.status === "completed" && Boolean(t.outputVideoUrl?.trim());
    const concatIncluded = params.concatIncludedByTransitionId.get(t.id) ?? false;
    let error: string | null = null;
    if (!providerPresent) {
      error = "missing_provider_video";
    } else if (!concatIncluded) {
      error = "missing_from_final_concat";
    }
    return {
      label: `${startNum}→${endNum}`,
      transitionOrder: t.order,
      startImageId: t.startImageId,
      endImageId: t.endImageId,
      providerPresent,
      concatIncluded,
      error,
    };
  });

  const allTransitionsPresent = transitionStatuses.every((row) => row.providerPresent);
  const allConcatIncluded =
    transitionStatuses.length === expected &&
    transitionStatuses.every((row) => row.concatIncluded);

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
    ok: allTransitionsPresent && allConcatIncluded,
  };
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
