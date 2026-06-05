/**
 * Studio V40 — Media Asset Director (registry validation, usage, handoff plan).
 */

import { STUDIO_ASSET_COLLECTIONS } from "@/lib/studio-media-asset-collections";
import {
  buildCharacterAssetBundles,
  buildLocationAssetBundles,
} from "@/lib/studio-media-asset-linking";
import {
  buildAssetUsageReport,
  buildAssetUsageSummary,
  buildRegistrySummaryWithUsage,
} from "@/lib/studio-media-asset-usage";
import { buildStudioAssetRegistry, buildRegistrySummary } from "@/lib/studio-media-asset-registry";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type {
  MediaAssetPlan,
  MediaAssetWarning,
  MotionMediaAssetHandoffPlan,
} from "@/types/studio-media-asset";

function detectMediaAssetWarnings(params: {
  storyboard: StudioStoryboardDetail;
  plan: Omit<MediaAssetPlan, "warnings" | "validationScore">;
}): MediaAssetWarning[] {
  const warnings: MediaAssetWarning[] = [];
  const scenes = params.storyboard.scenes ?? [];

  for (const bundle of params.plan.characterBundles) {
    if (bundle.referenceImages.length === 0) {
      warnings.push({
        code: "character_missing_reference",
        severity: "warning",
        messageKey: "studio.mediaAsset.warning.characterMissingReference",
        params: { name: bundle.characterName },
      });
    }
    if (bundle.voiceAssets.length === 0 && params.storyboard.voiceEnabled) {
      warnings.push({
        code: "character_missing_voice",
        severity: "info",
        messageKey: "studio.mediaAsset.warning.characterMissingVoice",
        params: { name: bundle.characterName },
      });
    }
  }

  for (const bundle of params.plan.locationBundles) {
    if (bundle.referenceImages.length === 0) {
      warnings.push({
        code: "location_missing_reference",
        severity: "info",
        messageKey: "studio.mediaAsset.warning.locationMissingReference",
        params: { name: bundle.locationName },
      });
    }
  }

  const scenesWithoutCharacters = scenes.filter((s) => (s.characters?.length ?? 0) === 0).length;
  if (scenesWithoutCharacters > 0) {
    warnings.push({
      code: "scenes_without_characters",
      severity: "info",
      messageKey: "studio.mediaAsset.warning.scenesWithoutCharacters",
      params: { count: scenesWithoutCharacters },
    });
  }

  const userAssets = params.plan.assets.filter((a) => a.source === "user");
  const withoutPreview = userAssets.filter(
    (a) => ["character", "location", "prop", "reference_image"].includes(a.category) && !a.previewUrl
  );
  if (withoutPreview.length > 0) {
    warnings.push({
      code: "missing_preview",
      severity: "info",
      messageKey: "studio.mediaAsset.warning.missingPreview",
      params: { count: withoutPreview.length },
    });
  }

  return warnings;
}

function computeValidationScore(params: {
  assets: MediaAssetPlan["assets"];
  usage: MediaAssetPlan["usage"];
  warnings: MediaAssetWarning[];
  characterBundles: MediaAssetPlan["characterBundles"];
}): number {
  if (params.assets.length === 0) {
    return 0;
  }
  const withUsage = params.usage.length / Math.max(1, params.assets.filter((a) => a.source === "user").length);
  const refCoverage =
    params.characterBundles.filter((b) => b.referenceImages.length > 0).length /
    Math.max(1, params.characterBundles.length);
  const penalty = params.warnings.filter((w) => w.severity === "warning").length * 10;
  return Math.max(0, Math.min(100, Math.round(withUsage * 35 + refCoverage * 45 + 20 - penalty)));
}

export function buildMediaAssetDirectorPlan(storyboard: StudioStoryboardDetail): MediaAssetPlan {
  const assets = buildStudioAssetRegistry({ storyboard, includeSystemCatalog: true });
  const characterBundles = buildCharacterAssetBundles(storyboard);
  const locationBundles = buildLocationAssetBundles(storyboard);
  const usage = buildAssetUsageReport(storyboard, assets);
  const collections = STUDIO_ASSET_COLLECTIONS.filter((c) =>
    c.assetIds.some((id) => assets.some((a) => a.id === id))
  );

  const base = {
    enabled: assets.length > 0,
    registrySummary: buildRegistrySummaryWithUsage(assets, usage),
    assets,
    collections,
    characterBundles,
    locationBundles,
    usage,
  };

  const warnings = detectMediaAssetWarnings({ storyboard, plan: base });

  return {
    ...base,
    warnings,
    validationScore: computeValidationScore({
      assets,
      usage,
      warnings,
      characterBundles,
    }),
  };
}

export function buildMotionMediaAssetHandoffPlan(
  storyboard: StudioStoryboardDetail
): MotionMediaAssetHandoffPlan {
  const plan = buildMediaAssetDirectorPlan(storyboard);
  const usedIds = new Set(plan.usage.map((u) => u.assetId));
  const referenced = plan.assets.filter((a) => usedIds.has(a.id) || a.source === "user");

  return {
    enabled: plan.enabled,
    registrySummary: plan.registrySummary,
    assetReferences: referenced.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      source: a.source,
      collectionIds: a.collectionIds,
    })),
    assetCollections: plan.collections,
    assetUsageSummary: buildAssetUsageSummary(plan.usage),
    characterBundles: plan.characterBundles,
    warnings: plan.warnings,
  };
}

export function isMediaAssetPlanReady(plan: MediaAssetPlan): boolean {
  return (
    plan.enabled &&
    plan.assets.length > 0 &&
    plan.characterBundles.length > 0 &&
    plan.validationScore >= 50 &&
    plan.warnings.every((w) => w.severity !== "warning" || w.code === "character_missing_voice")
  );
}

export function buildMotionAssetUsageSummary(plan: MediaAssetPlan): string {
  return buildRegistrySummary(plan.assets) || plan.registrySummary;
}
