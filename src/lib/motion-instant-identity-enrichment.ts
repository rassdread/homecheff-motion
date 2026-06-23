/**
 * Reuses Character Studio identity systems for Instant Motion prompts.
 * No new analysis stack — consumes existing vision / style DNA when present.
 */

import {
  buildIdentityEnforcementPromptBlocks,
  HARD_IDENTITY_LOCK_INTRO,
} from "@/lib/studio-asset-identity-preservation";
import {
  buildIdentityPreservationProfile,
  profilePreserveLabels,
} from "@/lib/assistant-identity-preservation";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";

export type MotionInstantIdentityContext = {
  sourceName?: string;
  assetType?: string | null;
  taxonomyType?: string | null;
  visionAnalysis?: AssetVisionAnalysis | null;
  styleDna?: AssetStyleDna | null;
  /** Cached analysis from library — skip re-analysis when true */
  analysisCached?: boolean;
};

export function buildMotionInstantIdentityPromptBlock(
  context: MotionInstantIdentityContext | null | undefined
): string {
  if (!context) {
    return HARD_IDENTITY_LOCK_INTRO;
  }

  const sourceName = context.sourceName?.trim() || "source character";
  if (context.visionAnalysis) {
    const blocks = buildIdentityEnforcementPromptBlocks({
      sourceName,
      vision: context.visionAnalysis,
      brandIdentity: context.styleDna?.brandIdentity ?? context.visionAnalysis.brandIdentity,
      assetFamily: context.visionAnalysis.assetFamily,
    });
    if (context.analysisCached) {
      blocks.push("Reuse existing identity analysis — do not alter face, hair, clothing palette, or brand marks.");
    }
    return blocks.join("\n\n");
  }

  const profile = buildIdentityPreservationProfile({
    assetType: context.assetType,
    assetName: context.sourceName,
    taxonomyType: context.taxonomyType,
  });
  const locked = profilePreserveLabels(profile, "en").join(", ");
  const styleHints = [context.styleDna?.colorTheme, context.styleDna?.brandIdentity]
    .filter(Boolean)
    .join("; ");
  const parts = [HARD_IDENTITY_LOCK_INTRO, `Locked traits: ${locked}.`];
  if (styleHints) {
    parts.push(`Style DNA palette: ${styleHints}.`);
  }
  return parts.join("\n\n");
}

export function motionInstantIdentityFromStyleDna(
  styleDna: AssetStyleDna | null | undefined,
  sourceName?: string
): MotionInstantIdentityContext | null {
  if (!styleDna) {
    return null;
  }
  return {
    sourceName,
    styleDna,
    analysisCached: true,
  };
}
