import {
  buildProvisionalVisionFromDetections,
  countFacesFromDetections,
  bodyVisibilityFromVision,
} from "@/lib/motion-vision-from-detection";
import { detectMotionCharacterParts } from "@/lib/motion-ready-character-wizard";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { ObjectDetection } from "@/server/animation-export/local-vision/object-detector-types";
import type { MotionUploadedReference } from "@/types/motion-preset-engine";

export type MotionVisionSignalSource =
  | "full_vision"
  | "rtdetr_preview"
  | "style_dna"
  | "motion_ready"
  | "heuristic";

export type MotionReferenceVisionSignals = {
  referenceId: string;
  source: MotionVisionSignalSource;
  objectType: AssetVisionAnalysis["objectType"];
  faceCount: number;
  faceDetected: boolean;
  fullBodyVisible: boolean;
  upperBodyVisible: boolean;
  legsVisible: boolean;
  shoesVisible: boolean;
  mascotDetected: boolean;
  logoDetected: boolean;
  productDetected: boolean;
  styleDnaStrength: number;
  identityConfidence: number;
  visionAnalysis: AssetVisionAnalysis | null;
  detectionLabels: string[];
  analysisCached: boolean;
};

function styleDnaStrength(ref: MotionUploadedReference): number {
  if (!ref.styleDna) {
    return 0;
  }
  let score = 40;
  if (ref.styleDna.visualStyle) score += 15;
  if (ref.styleDna.colorTheme) score += 15;
  if (ref.styleDna.brandIdentity) score += 15;
  if (ref.styleDna.mascotTraits) score += 15;
  return Math.min(100, score);
}

function identityConfidenceFromVision(vision: AssetVisionAnalysis | null, cached: boolean): number {
  if (!vision) {
    return cached ? 70 : 25;
  }
  let score = Math.round((vision.confidence ?? 0.5) * 100);
  if (vision.identityFingerprint?.faceStructure) score += 10;
  if (vision.keyFeatures.length > 0) score += 5;
  if (cached) score += 15;
  return Math.min(100, score);
}

export function buildMotionReferenceVisionSignals(input: {
  reference: MotionUploadedReference;
  detections?: ObjectDetection[];
}): MotionReferenceVisionSignals {
  const ref = input.reference;
  let vision = ref.visionAnalysis ?? null;
  let source: MotionVisionSignalSource = "heuristic";
  const analysisCached = Boolean(ref.motionReady || (ref.visionAnalysis && ref.styleDna));

  if (ref.motionReady && ref.visionAnalysis) {
    source = "motion_ready";
    vision = ref.visionAnalysis;
  } else if (ref.visionAnalysis) {
    source = "full_vision";
    vision = ref.visionAnalysis;
  } else if (input.detections && input.detections.length > 0) {
    source = "rtdetr_preview";
    vision = buildProvisionalVisionFromDetections({
      detections: input.detections,
      fileName: ref.fileName,
      width: ref.width,
      height: ref.height,
    });
  } else if (ref.styleDna && !vision) {
    source = "style_dna";
  }

  const labels = input.detections?.map((d) => d.label) ?? [];
  const parts = vision ? detectMotionCharacterParts(vision) : [];
  const bodyVis = bodyVisibilityFromVision(vision);
  const faceCount =
    vision ?
      vision.objectType === "human" || vision.objectType === "character" || vision.objectType === "mascot"
        ? Math.max(1, countFacesFromDetections(input.detections ?? []))
        : 0
    : countFacesFromDetections(input.detections ?? []);

  const partPresent = (id: string) => parts.find((p) => p.id === id)?.status === "present";

  return {
    referenceId: ref.id,
    source,
    objectType: vision?.objectType ?? "unknown",
    faceCount,
    faceDetected: partPresent("face") || faceCount > 0 || Boolean(vision?.identityFingerprint?.faceStructure),
    fullBodyVisible: bodyVis === "full_body" || partPresent("legs"),
    upperBodyVisible:
      bodyVis === "full_body" || bodyVis === "half_body" || bodyVis === "portrait" || partPresent("torso"),
    legsVisible: partPresent("legs") || bodyVis === "full_body",
    shoesVisible: partPresent("feet") || bodyVis === "full_body",
    mascotDetected: vision?.objectType === "mascot" || /mascot/i.test(ref.assetType ?? ref.fileName ?? ""),
    logoDetected: vision?.objectType === "logo" || vision?.objectType === "brand_asset" || /logo/i.test(ref.fileName ?? ""),
    productDetected:
      vision?.objectType === "product" ||
      vision?.objectType === "packaging" ||
      ref.role === "product" ||
      /product|item|meal|dish/.test(ref.fileName ?? ""),
    styleDnaStrength: styleDnaStrength(ref),
    identityConfidence: identityConfidenceFromVision(vision, analysisCached),
    visionAnalysis: vision,
    detectionLabels: labels,
    analysisCached,
  };
}

export function buildMotionReferenceVisionSignalsBatch(input: {
  references: MotionUploadedReference[];
  detectionsByReferenceId?: Record<string, ObjectDetection[]>;
}): MotionReferenceVisionSignals[] {
  return input.references.map((reference) =>
    buildMotionReferenceVisionSignals({
      reference,
      detections: input.detectionsByReferenceId?.[reference.id],
    })
  );
}

export function aggregateMotionVisionWorkload(signals: MotionReferenceVisionSignals[]): {
  faceCount: number;
  mascotCount: number;
  logoCount: number;
  productCount: number;
  cachedCount: number;
  uncachedCount: number;
  cacheReusePercent: number;
  requiredAnalysisPasses: number;
  averageIdentityConfidence: number;
} {
  const faceCount = signals.reduce((sum, s) => sum + s.faceCount, 0);
  const mascotCount = signals.filter((s) => s.mascotDetected).length;
  const logoCount = signals.filter((s) => s.logoDetected).length;
  const productCount = signals.filter((s) => s.productDetected).length;
  const cachedCount = signals.filter((s) => s.analysisCached).length;
  const uncachedCount = Math.max(0, signals.length - cachedCount);
  const cacheReusePercent =
    signals.length === 0 ? 0 : Math.round((cachedCount / signals.length) * 100);
  const requiredAnalysisPasses = uncachedCount;
  const averageIdentityConfidence =
    signals.length === 0
      ? 0
      : Math.round(signals.reduce((sum, s) => sum + s.identityConfidence, 0) / signals.length);

  return {
    faceCount,
    mascotCount,
    logoCount,
    productCount,
    cachedCount,
    uncachedCount,
    cacheReusePercent,
    requiredAnalysisPasses,
    averageIdentityConfidence,
  };
}
