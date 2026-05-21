/**
 * No-credit render validation — plan Vidu job without calling the provider.
 */

import type { AnimationStyleId } from "@/lib/animation-style-types";
import { analyzeSceneIntelligence } from "@/lib/scene-intelligence";
import type { CharacterSceneRole } from "@/lib/character-role-engine";
import {
  blocksFromImageProtection,
  buildLockedTextRegionsFromBlocks,
  hasVisibleHeroHeadline,
  imageNeedsTextLockWarning,
  isTextHeavyImage,
  resolveTextLockMode,
  type LockedTextRegion,
  type TextLockMode,
} from "@/lib/hard-text-lock";
import { parseBakedTextProtectionPayload } from "@/lib/baked-text-detection";
import { pickComicStripTransitionBridge } from "@/lib/vidu-comic-strip-transitions";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";
import { parsePremiumPolishSettings, resolvePremiumPolishProfile } from "@/lib/premium-polish-settings";
import type { InstantPremiumCreatePayload } from "@/server/instant-premium/create-instant-premium-project";
import {
  buildSegmentJoinPlan,
  scoreKeyframePairQuick,
  type SegmentJoinPlan,
} from "@/lib/exact-frame-continuity";
import type { FrameContinuityMode } from "@/lib/exact-frame-continuity";
import {
  buildPremiumQualityGateSummary,
  primaryContinuityModeFromJoins,
  type PremiumQualityGateSummary,
} from "@/lib/deevid-premium-polish";
import {
  resolveMicroActingProfileId,
  type MicroActingProfileId,
} from "@/lib/premium-facial-acting";
export type PredictedConcatTimelineEntry = {
  playOrder: number;
  segmentIndex: number;
  startImageId: string;
  endImageId: string;
  fileName: string;
  joinMode?: string;
  continuityMode?: string;
  sharedKeyframe?: boolean;
};

export function buildPredictedConcatTimeline(params: {
  images: Array<{ fileName: string }>;
  segmentJoins: SegmentJoinPlan[];
}): PredictedConcatTimelineEntry[] {
  const { images, segmentJoins } = params;
  const entries: PredictedConcatTimelineEntry[] = [];
  const segmentCount = Math.max(segmentJoins.length, images.length - 1);
  for (let i = 0; i < segmentCount; i += 1) {
    const start = images[i];
    const end = images[i + 1];
    if (!start || !end) {
      break;
    }
    const join = segmentJoins[i];
    const sharedKeyframe = Boolean(join && join.similarity >= 0.995);
    entries.push({
      playOrder: i + 1,
      segmentIndex: i,
      startImageId: start.fileName,
      endImageId: end.fileName,
      fileName: `${start.fileName} → ${end.fileName}`,
      joinMode: join?.joinMode,
      continuityMode: join?.mode,
      sharedKeyframe,
    });
  }
  return entries;
}

export type PremiumRenderValidationImageReport = {
  index: number;
  fileName: string;
  urlValid: boolean;
  lockedRegionCount: number;
  lockedRegions: LockedTextRegion[];
  /** Kept visible copy protected by prompt only (not hard-locked). */
  promptProtectedCount: number;
  promptProtectedPreviews: string[];
  textHeavy: boolean;
  textLockWarning: boolean;
  headlineNotLocked: boolean;
  heroHeadlineVisible: boolean;
};

export type PremiumRenderValidationReport = {
  ok: boolean;
  wouldCallVidu: boolean;
  blockCode?: string;
  blockMessage?: string;
  viduPromptChars: number;
  animationStyleId: AnimationStyleId;
  textLockMode: TextLockMode;
  segmentBridge: string;
  detectedRoles: string[];
  microActingProfile: MicroActingProfileId;
  continuityMode: FrameContinuityMode;
  transitionTotal: number;
  segmentJoins: SegmentJoinPlan[];
  concatTimeline: PredictedConcatTimelineEntry[];
  qualityGates: PremiumQualityGateSummary;
  images: PremiumRenderValidationImageReport[];
  warnings: string[];
};

export function buildPremiumRenderValidationReport(params: {
  payload: InstantPremiumCreatePayload;
  viduPromptChars: number;
  viduPromptOk: boolean;
  extraWarnings?: string[];
}): PremiumRenderValidationReport {
  const { payload, viduPromptChars, viduPromptOk } = params;
  const profile = resolvePremiumPolishProfile(payload.posterMotionSettings);
  const parsedPolish = parsePremiumPolishSettings(payload.posterMotionSettings);
  const textLockMode = resolveTextLockMode(
    profile.animationStyleId,
    profile.textLockMode
  );
  const transitionTotal = Math.max(0, payload.images.length - 1);
  const segmentBridge = pickComicStripTransitionBridge(1);

  const scene =
    parsedPolish.sceneIntelligence ??
    analyzeSceneIntelligence({
      animationStyleId: profile.animationStyleId,
      userIntent: payload.userIntent ?? null,
      imageCount: payload.images.length,
      textBlockHints: payload.images.flatMap((img) => {
        const protection = parseBakedTextProtectionPayload(img.bakedTextProtection);
        const blocks = blocksFromImageProtection(protection, null);
        return blocks.map((b) => (b.editedText || b.text).trim()).filter(Boolean);
      }),
    });
  const roles: CharacterSceneRole[] = scene.detectedRoles ?? [];
  const detectedRoles = roles.map((r) => r.roleId.replace(/_/g, " "));
  const microActingProfile = resolveMicroActingProfileId(roles);

  const warnings = [...(params.extraWarnings ?? [])];
  const imageReports: PremiumRenderValidationImageReport[] = [];

  let urlInvalid = false;
  let textLockBlock = false;

  for (let index = 0; index < payload.images.length; index += 1) {
    const image = payload.images[index]!;
    const url = image.workingImageUrl?.trim() || image.previewUrl?.trim() || "";
    const urlValid = isValidHttpUrl(url);
    if (!urlValid) {
      urlInvalid = true;
    }
    const protection = parseBakedTextProtectionPayload(image.bakedTextProtection);
    const blocks = blocksFromImageProtection(protection, null);
    const lockedRegions = buildLockedTextRegionsFromBlocks(blocks, textLockMode);
    const lockedIds = new Set(lockedRegions.map((r) => r.id));
    const promptProtected = blocks.filter(
      (b) =>
        b.kept !== false &&
        (b.editedText || b.text).trim().length >= 2 &&
        !lockedIds.has(b.id)
    );
    const textHeavy = isTextHeavyImage(blocks);
    const heroHeadlineVisible = hasVisibleHeroHeadline(blocks);
    const headlineNotLocked =
      heroHeadlineVisible && lockedRegions.length === 0 && textLockMode === "auto_hard_lock";
    const textLockWarning = imageNeedsTextLockWarning(blocks, textLockMode, lockedRegions.length);

    if (textLockWarning || headlineNotLocked) {
      textLockBlock = true;
      warnings.push(
        `Image ${index + 1}: visible headline/text not hard-locked — scan and confirm regions.`
      );
    }
    if (textHeavy && textLockMode === "auto_hard_lock" && lockedRegions.length === 0) {
      warnings.push(`Image ${index + 1}: text-heavy poster with zero hard-locked regions.`);
    }
    if (promptProtected.length > 0 && lockedRegions.length === 0) {
      warnings.push(
        `Image ${index + 1}: ${promptProtected.length} text region(s) prompt-protected only (not patch-locked).`
      );
    }

    imageReports.push({
      index,
      fileName: image.fileName,
      urlValid,
      lockedRegionCount: lockedRegions.length,
      lockedRegions,
      promptProtectedCount: promptProtected.length,
      promptProtectedPreviews: promptProtected
        .map((b) => (b.editedText || b.text).trim().slice(0, 40))
        .slice(0, 4),
      textHeavy,
      textLockWarning,
      headlineNotLocked,
      heroHeadlineVisible,
    });
  }

  const baseTransitionSec = 8 / 30;
  const segmentJoins: SegmentJoinPlan[] = [];
  for (let i = 0; i < payload.images.length - 1; i += 1) {
    const endImg = payload.images[i]!;
    const startImg = payload.images[i + 1]!;
    const score = scoreKeyframePairQuick({
      endImageId: endImg.fileName,
      startImageId: startImg.fileName,
      endPreviewUrl: endImg.workingImageUrl ?? endImg.previewUrl,
      startPreviewUrl: startImg.workingImageUrl ?? startImg.previewUrl,
    });
    segmentJoins.push(
      buildSegmentJoinPlan({
        segmentA: i,
        segmentB: i + 1,
        score,
        baseTransitionSec,
      })
    );
  }

  const continuityMode = primaryContinuityModeFromJoins(segmentJoins);
  const concatTimeline = buildPredictedConcatTimeline({
    images: payload.images.map((img) => ({ fileName: img.fileName })),
    segmentJoins,
  });

  let ok = true;
  let blockCode: string | undefined;
  let blockMessage: string | undefined;

  if (!viduPromptOk) {
    ok = false;
    blockCode = "VIDU_PROMPT_TOO_LONG";
    blockMessage = "Vidu prompt exceeds character limit.";
  } else if (urlInvalid) {
    ok = false;
    blockCode = "INVALID_IMAGE_URL";
    blockMessage = "One or more image URLs are invalid.";
  } else if (textLockBlock && textLockMode === "auto_hard_lock") {
    ok = false;
    blockCode = "TEXT_LOCK_REQUIRED";
    blockMessage =
      "Large visible text must be hard-locked before a paid render. Scan and confirm text regions.";
  } else if (
    profile.animationStyleId === "cartoon_animation" &&
    imageReports.some((img) => img.heroHeadlineVisible && img.lockedRegionCount === 0)
  ) {
    ok = false;
    blockCode = "TEXT_LOCK_REQUIRED";
    blockMessage =
      "Cartoon Animation: hero headline text must be hard-locked before spending Vidu credits.";
  }

  const qualityGates = buildPremiumQualityGateSummary({
    promptChars: viduPromptChars,
    promptOk: viduPromptOk,
    textLockBlock,
    textLockMode,
    urlInvalid,
    imageCount: payload.images.length,
    transitionTotal,
    detectedRoles,
    segmentJoins,
  });

  const wouldCallVidu = ok && transitionTotal > 0;

  return {
    ok,
    wouldCallVidu,
    blockCode,
    blockMessage,
    viduPromptChars,
    animationStyleId: profile.animationStyleId,
    textLockMode,
    segmentBridge,
    detectedRoles,
    microActingProfile,
    continuityMode,
    transitionTotal,
    segmentJoins,
    concatTimeline,
    qualityGates,
    images: imageReports,
    warnings,
  };
}
