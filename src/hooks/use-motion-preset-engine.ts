"use client";

import { useMemo } from "react";
import { evaluateMotionPresetPipeline } from "@/lib/motion-preset-engine-orchestrator";
import type { MotionReferenceVisionSignals } from "@/lib/motion-reference-vision-signals";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type {
  MotionPresetEngineSnapshot,
  MotionUploadedReference,
} from "@/types/motion-preset-engine";
import type { ObjectDetection } from "@/server/animation-export/local-vision/object-detector-types";

export type UseMotionPresetEngineInput = {
  presetId: MotionActionPresetId | null;
  references: MotionUploadedReference[];
  imageCount: number;
  instantMode: "transition" | "story";
  transitionSeconds: 3 | 5 | 8;
  sceneTextCount?: number;
  userIsAdmin?: boolean;
  motionReadyFlag?: boolean | null;
  previousSnapshot?: MotionPresetEngineSnapshot | null;
  visionSignals?: MotionReferenceVisionSignals[];
  detectionsByReferenceId?: Record<string, ObjectDetection[]>;
  visionAnalyzing?: boolean;
};

export function useMotionPresetEngine(input: UseMotionPresetEngineInput) {
  const snapshot = useMemo(() => {
    if (!input.presetId || input.imageCount < 1) {
      return null;
    }
    if (input.visionAnalyzing) {
      return input.previousSnapshot ?? null;
    }
    return evaluateMotionPresetPipeline({
      presetId: input.presetId,
      references: input.references,
      imageCount: input.imageCount,
      instantMode: input.instantMode,
      transitionSeconds: input.transitionSeconds,
      sceneTextCount: input.sceneTextCount,
      userIsAdmin: input.userIsAdmin,
      visionSignals: input.visionSignals,
      detectionsByReferenceId: input.detectionsByReferenceId,
      existingSnapshot: input.previousSnapshot,
      motionReadyAnalysis:
        input.motionReadyFlag ?
          {
            styleDna: input.references.find((r) => r.styleDna)?.styleDna ?? null,
            vision: input.references.find((r) => r.visionAnalysis)?.visionAnalysis ?? null,
          }
        : null,
    });
  }, [
    input.presetId,
    input.references,
    input.imageCount,
    input.instantMode,
    input.transitionSeconds,
    input.sceneTextCount,
    input.userIsAdmin,
    input.motionReadyFlag,
    input.previousSnapshot,
    input.visionSignals,
    input.detectionsByReferenceId,
    input.visionAnalyzing,
  ]);

  return {
    snapshot,
    canRender: snapshot?.qualityValidation.blockRender === false,
    qualityScore: snapshot?.qualityValidation.qualityScore.overall ?? null,
    estimatedTotalCredits: snapshot?.complexityEstimate.estimatedTotalCredits ?? null,
    estimatedAnalysisCredits: snapshot?.complexityEstimate.estimatedAnalysisCredits ?? null,
    estimatedRenderCredits: snapshot?.complexityEstimate.estimatedRenderCredits ?? null,
    analysisCached: snapshot?.complexityEstimate.analysisCached ?? false,
  };
}

export function motionReferencesFromImages(
  images: Array<{
    id: string;
    originalFileName: string;
    naturalWidth?: number;
    naturalHeight?: number;
    remoteWorkingUrl?: string | null;
    remoteThumbnailUrl?: string | null;
    styleDna?: import("@/types/studio-asset-derivation").AssetStyleDna | null;
    visionAnalysis?: import("@/types/studio-asset-vision-analysis").AssetVisionAnalysis | null;
    assetType?: string | null;
    assetName?: string | null;
  }>,
  motionReady?: boolean | null
): MotionUploadedReference[] {
  return images.map((img) => ({
    id: img.id,
    fileName: img.originalFileName,
    width: img.naturalWidth,
    height: img.naturalHeight,
    motionReady: motionReady ?? null,
    styleDna: img.styleDna ?? null,
    visionAnalysis: img.visionAnalysis ?? null,
    assetType: img.assetType ?? null,
    assetName: img.assetName ?? null,
  }));
}

export function motionVisionPreviewReferencesFromImages(
  images: Array<{
    id: string;
    originalFileName: string;
    naturalWidth?: number;
    naturalHeight?: number;
    remoteWorkingUrl?: string | null;
    remoteThumbnailUrl?: string | null;
    styleDna?: import("@/types/studio-asset-derivation").AssetStyleDna | null;
    visionAnalysis?: import("@/types/studio-asset-vision-analysis").AssetVisionAnalysis | null;
    assetType?: string | null;
    assetName?: string | null;
  }>,
  motionReady?: boolean | null
) {
  return images.map((img) => ({
    ...motionReferencesFromImages([img], motionReady)[0]!,
    imageUrl: img.remoteWorkingUrl ?? img.remoteThumbnailUrl ?? null,
  }));
}
