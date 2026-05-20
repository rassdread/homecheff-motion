/**
 * No-credit render validation — plan Vidu job without calling the provider.
 */

import type { AnimationStyleId } from "@/lib/animation-style-types";
import { analyzeSceneIntelligence } from "@/lib/scene-intelligence";
import type { CharacterSceneRole } from "@/lib/character-role-engine";
import {
  blocksFromImageProtection,
  buildLockedTextRegionsFromBlocks,
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

export type PremiumRenderValidationImageReport = {
  index: number;
  fileName: string;
  urlValid: boolean;
  lockedRegionCount: number;
  lockedRegions: LockedTextRegion[];
  textHeavy: boolean;
  textLockWarning: boolean;
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
  transitionTotal: number;
  /** Predicted joins between consecutive uploaded images (no Vidu). */
  segmentJoins: SegmentJoinPlan[];
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
    const textHeavy = isTextHeavyImage(blocks);
    const textLockWarning = imageNeedsTextLockWarning(blocks, textLockMode, lockedRegions.length);
    if (textLockWarning) {
      textLockBlock = true;
      warnings.push(
        `Image ${index + 1}: large text detected but no locked regions — scan and confirm text first.`
      );
    }
    if (textHeavy && textLockMode === "auto_hard_lock" && lockedRegions.length === 0) {
      warnings.push(`Image ${index + 1}: text-heavy poster with zero hard-locked regions.`);
    }
    imageReports.push({
      index,
      fileName: image.fileName,
      urlValid,
      lockedRegionCount: lockedRegions.length,
      lockedRegions,
      textHeavy,
      textLockWarning,
    });
  }

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
  }

  const wouldCallVidu = ok && transitionTotal > 0;

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
    transitionTotal,
    segmentJoins,
    images: imageReports,
    warnings,
  };
}
