/**
 * Studio V40 — asset usage tracking across storyboard entities.
 */

import { collectStoryboardCharacters } from "@/lib/studio-character-voice";
import { buildRegistrySummary, studioAssetId } from "@/lib/studio-media-asset-registry";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { StudioAsset, StudioAssetUsageEntry, StudioAssetUsageRef } from "@/types/studio-media-asset";

function pushUsage(
  map: Map<string, StudioAssetUsageEntry>,
  asset: StudioAsset,
  ref: StudioAssetUsageRef
) {
  const existing = map.get(asset.id);
  if (existing) {
    if (!existing.usedBy.some((u) => u.entityId === ref.entityId && u.entityType === ref.entityType)) {
      existing.usedBy.push(ref);
    }
    return;
  }
  map.set(asset.id, {
    assetId: asset.id,
    assetName: asset.name,
    category: asset.category,
    usedBy: [ref],
  });
}

export function buildAssetUsageReport(
  storyboard: StudioStoryboardDetail,
  registry: StudioAsset[]
): StudioAssetUsageEntry[] {
  const map = new Map<string, StudioAssetUsageEntry>();
  const assetById = new Map(registry.map((a) => [a.id, a]));

  const storyboardRef: StudioAssetUsageRef = {
    entityType: "storyboard",
    entityId: storyboard.id,
    entityName: storyboard.title,
  };

  for (const character of collectStoryboardCharacters(storyboard)) {
    const charAsset = assetById.get(studioAssetId("character", character.id));
    if (charAsset) {
      pushUsage(map, charAsset, {
        entityType: "character",
        entityId: character.id,
        entityName: character.name,
      });
      pushUsage(map, charAsset, storyboardRef);
    }
    const refAsset = assetById.get(studioAssetId("reference_image", `char_${character.id}`));
    if (refAsset) {
      pushUsage(map, refAsset, {
        entityType: "character",
        entityId: character.id,
        entityName: character.name,
      });
    }
    if (character.voiceEnabled) {
      const voiceAsset = assetById.get(studioAssetId("voice", `char_voice_${character.id}`));
      if (voiceAsset) {
        pushUsage(map, voiceAsset, storyboardRef);
      }
    }
  }

  for (const scene of storyboard.scenes) {
    const sceneRef: StudioAssetUsageRef = {
      entityType: "scene",
      entityId: scene.id,
      entityName: scene.title || `Scene ${scene.order + 1}`,
      sceneOrder: scene.order,
    };

    for (const character of scene.characters ?? []) {
      const charAsset = assetById.get(studioAssetId("character", character.id));
      if (charAsset) {
        pushUsage(map, charAsset, sceneRef);
      }
    }

    if (scene.location) {
      const locAsset = assetById.get(studioAssetId("location", scene.location.id));
      if (locAsset) {
        pushUsage(map, locAsset, sceneRef);
        pushUsage(map, locAsset, storyboardRef);
      }
    }

    for (const prop of scene.props ?? []) {
      const propAsset = assetById.get(studioAssetId("prop", prop.id));
      if (propAsset) {
        pushUsage(map, propAsset, sceneRef);
      }
    }

    for (const img of scene.sceneImages ?? []) {
      if (img.status === "completed") {
        const imgAsset = assetById.get(studioAssetId("reference_image", `scene_img_${img.id}`));
        if (imgAsset) {
          pushUsage(map, imgAsset, sceneRef);
        }
      }
    }
  }

  return [...map.values()].sort((a, b) => a.assetName.localeCompare(b.assetName));
}

export function buildAssetUsageSummary(usage: StudioAssetUsageEntry[]): string {
  if (usage.length === 0) {
    return "";
  }
  const storyboards = new Set(
    usage.flatMap((u) => u.usedBy.filter((r) => r.entityType === "storyboard").map((r) => r.entityName))
  );
  const scenes = usage.reduce(
    (sum, u) => sum + u.usedBy.filter((r) => r.entityType === "scene").length,
    0
  );
  return `${usage.length} assets · ${storyboards.size} storyboard(s) · ${scenes} scene refs`;
}

export function buildRegistrySummaryWithUsage(registry: StudioAsset[], usage: StudioAssetUsageEntry[]): string {
  const base = buildRegistrySummary(registry);
  const usedCount = usage.length;
  return base ? `${base} · ${usedCount} in use` : `${usedCount} in use`;
}
