/**
 * Studio V40 — predefined asset collections.
 */

import { getStudioAudioAsset, listStudioAudioAssets } from "@/lib/studio-audio-asset-library";
import { STUDIO_VOICE_PROFILE_IDS } from "@/lib/studio-voice-profiles";
import type { StudioAssetCategory, StudioAssetCollection } from "@/types/studio-media-asset";

export const STUDIO_BRAND_ASSET_IDS = [
  "brand_homecheff_logo",
  "brand_homecheff_mascot",
  "brand_homegarden_logo",
  "brand_homegarden_mascot",
  "brand_homedesigner_logo",
  "brand_homedesigner_icon",
] as const;

function voicePresetAssetId(id: string): string {
  return `voice:preset_${id}`;
}

function audioCatalogToRegistryId(catalogId: string): string {
  const asset = getStudioAudioAsset(catalogId);
  if (!asset) {
    return `voice:${catalogId}`;
  }
  const category: StudioAssetCategory =
    asset.category === "sfx" ? "sound_effect"
    : asset.category === "ambience" ? "ambience"
    : asset.category === "music" ? "music"
    : "voice";
  return `${category}:${catalogId}`;
}

function brandAssetId(id: string): string {
  return `brand:${id}`;
}

export const STUDIO_ASSET_COLLECTIONS: StudioAssetCollection[] = [
  {
    id: "homecheff_mascots",
    name: "HomeCheff Mascots",
    description: "Mascot characters and brand figures for HomeCheff stories.",
    labelKey: "studio.mediaAsset.collection.homecheffMascots",
    brandKey: "homecheff",
    assetIds: [
      brandAssetId("brand_homecheff_mascot"),
      brandAssetId("brand_homegarden_mascot"),
    ],
  },
  {
    id: "homegarden_pack",
    name: "HomeGarden Pack",
    description: "Garden-themed locations, ambience, and calm music.",
    labelKey: "studio.mediaAsset.collection.homegardenPack",
    brandKey: "homegarden",
    assetIds: [
      audioCatalogToRegistryId("amb_birds"),
      audioCatalogToRegistryId("amb_light_wind"),
      audioCatalogToRegistryId("music_community_intro"),
      brandAssetId("brand_homegarden_logo"),
      brandAssetId("brand_homegarden_mascot"),
    ],
  },
  {
    id: "community_sounds",
    name: "Community Sounds",
    description: "Crowd, market, and neighbourhood sound effects.",
    labelKey: "studio.mediaAsset.collection.communitySounds",
    assetIds: listStudioAudioAssets("sfx")
      .filter((a) => a.tags.some((t) => ["crowd", "market", "community", "footsteps"].includes(t)))
      .map((a) => audioCatalogToRegistryId(a.id)),
  },
  {
    id: "corporate_voices",
    name: "Corporate Voices",
    description: "Polished presenter and commercial voice presets.",
    labelKey: "studio.mediaAsset.collection.corporateVoices",
    assetIds: [
      voicePresetAssetId("commercial"),
      voicePresetAssetId("premium_brand"),
      audioCatalogToRegistryId("voice_commercial"),
      audioCatalogToRegistryId("voice_narrator_a"),
    ],
  },
  {
    id: "documentary_music",
    name: "Documentary Music",
    description: "Observational beds and documentary narration voices.",
    labelKey: "studio.mediaAsset.collection.documentaryMusic",
    assetIds: [
      audioCatalogToRegistryId("music_documentary_ambient"),
      voicePresetAssetId("documentary"),
      audioCatalogToRegistryId("voice_documentary"),
    ],
  },
];

export function getStudioAssetCollection(id: string): StudioAssetCollection | null {
  return STUDIO_ASSET_COLLECTIONS.find((c) => c.id === id) ?? null;
}

export function resolveCollectionIdsForAsset(assetId: string): string[] {
  return STUDIO_ASSET_COLLECTIONS.filter((c) => c.assetIds.includes(assetId)).map((c) => c.id);
}

export function assignCollectionsToAssets<T extends { id: string; collectionIds: string[] }>(
  assets: T[]
): T[] {
  return assets.map((asset) => ({
    ...asset,
    collectionIds: resolveCollectionIdsForAsset(asset.id),
  }));
}

export function buildBrandAssetRegistryEntries(): import("@/types/studio-media-asset").StudioAsset[] {
  const now = new Date(0).toISOString();
  const brands: Array<{ id: string; name: string; description: string; tags: string[]; brandKey: string }> = [
    {
      id: "brand_homecheff_logo",
      name: "HomeCheff Logo",
      description: "Primary HomeCheff brand logo.",
      tags: ["logo", "homecheff", "brand"],
      brandKey: "homecheff",
    },
    {
      id: "brand_homecheff_mascot",
      name: "HomeCheff Mascot",
      description: "Chef mascot figure for HomeCheff stories.",
      tags: ["mascot", "homecheff", "character"],
      brandKey: "homecheff",
    },
    {
      id: "brand_homegarden_logo",
      name: "HomeGarden Logo",
      description: "HomeGarden brand logo.",
      tags: ["logo", "homegarden", "brand"],
      brandKey: "homegarden",
    },
    {
      id: "brand_homegarden_mascot",
      name: "HomeGarden Mascot",
      description: "Garden guide mascot for HomeGarden stories.",
      tags: ["mascot", "homegarden", "character"],
      brandKey: "homegarden",
    },
    {
      id: "brand_homedesigner_logo",
      name: "HomeDesigner Logo",
      description: "HomeDesigner brand logo.",
      tags: ["logo", "homedesigner", "brand"],
      brandKey: "homedesigner",
    },
    {
      id: "brand_homedesigner_icon",
      name: "HomeDesigner Icon",
      description: "Compact HomeDesigner app icon.",
      tags: ["icon", "homedesigner", "brand"],
      brandKey: "homedesigner",
    },
  ];

  return brands.map((b) => ({
    id: brandAssetId(b.id),
    name: b.name,
    category: "brand_asset" as const,
    description: b.description,
    tags: b.tags,
    owner: "system",
    source: "system" as const,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
    sourceRef: { entityType: "brand_catalog" as const, entityId: b.id },
    previewUrl: null,
    collectionIds: resolveCollectionIdsForAsset(brandAssetId(b.id)),
  }));
}

export function listVoicePresetAssetIds(): string[] {
  return STUDIO_VOICE_PROFILE_IDS.map((id) => voicePresetAssetId(id));
}
