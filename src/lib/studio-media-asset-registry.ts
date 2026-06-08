/**
 * Studio V40 — unified asset registry (indexes DB entities + system catalogs).
 */

import { listStudioAudioAssets } from "@/lib/studio-audio-asset-library";
import {
  buildSemanticContinuitySnapshot,
  extractAssetSemanticRecordFromCharacter,
  extractAssetSemanticRecordFromLocation,
  extractAssetSemanticRecordFromProp,
} from "@/lib/studio-asset-semantic-record";
import type { AssetSemanticRecord } from "@/types/studio-asset-semantic-record";
import {
  assignCollectionsToAssets,
  buildBrandAssetRegistryEntries,
} from "@/lib/studio-media-asset-collections";
import { getVoiceProfilePreset, STUDIO_VOICE_PROFILE_IDS } from "@/lib/studio-voice-profiles";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioAsset, StudioAssetCategory } from "@/types/studio-media-asset";

const EPOCH = new Date(0).toISOString();

export function studioAssetId(category: StudioAssetCategory, entityId: string): string {
  return `${category}:${entityId}`;
}

function inferReferenceImageOrigin(record: AssetSemanticRecord | null): StudioAsset["origin"] {
  if (record?.derivedFromAssetId || record?.parentAssetId) {
    return "derived";
  }
  if (record?.sourceReferenceName || record?.changeRules?.length) {
    return "generated";
  }
  return "uploaded";
}

function withSemanticContinuity(
  asset: StudioAsset,
  record: AssetSemanticRecord | null
): StudioAsset {
  const snapshot = buildSemanticContinuitySnapshot(record);
  return snapshot ? { ...asset, semanticContinuity: snapshot } : asset;
}

function audioCategoryToAssetCategory(
  category: "voice" | "music" | "ambience" | "sfx"
): StudioAssetCategory {
  if (category === "voice") return "voice";
  if (category === "music") return "music";
  if (category === "ambience") return "ambience";
  return "sound_effect";
}

export function buildSystemAudioRegistryAssets(): StudioAsset[] {
  return listStudioAudioAssets().map((a) => ({
    id: studioAssetId(audioCategoryToAssetCategory(a.category), a.id),
    name: a.name,
    category: audioCategoryToAssetCategory(a.category),
    description: a.description,
    tags: [...a.tags, ...a.moodTags, ...a.energyTags],
    owner: "system",
    source: "system" as const,
    visibility: "system_hidden" as const,
    status: "active" as const,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    sourceRef: { entityType: "audio_catalog" as const, entityId: a.id },
    previewUrl: null,
    collectionIds: [],
  }));
}

export function buildVoicePresetRegistryAssets(): StudioAsset[] {
  return STUDIO_VOICE_PROFILE_IDS.map((id) => {
    const preset = getVoiceProfilePreset(id);
    return {
      id: studioAssetId("voice", `preset_${id}`),
      name: id.replace(/_/g, " "),
      category: "voice" as const,
      description: preset.elevenLabsVoiceRecommendation,
      tags: ["voice_preset", id, preset.suggestedNarrationMode],
      owner: "system",
      source: "system" as const,
      visibility: "placeholder" as const,
      status: "active" as const,
      createdAt: EPOCH,
      updatedAt: EPOCH,
      sourceRef: { entityType: "voice_preset" as const, entityId: id },
      previewUrl: null,
      collectionIds: [],
    };
  });
}

export function characterToRegistryAsset(
  character: StudioCharacterListItem,
  options?: { isSystem?: boolean }
): StudioAsset {
  const record = extractAssetSemanticRecordFromCharacter(character);
  const asset: StudioAsset = {
    id: studioAssetId("character", character.id),
    name: character.name,
    category: "character",
    description: character.description || character.personality || "",
    tags: [
      character.role,
      ...(character.isMascot ? ["mascot"] : []),
      ...(character.visualKeywords ? character.visualKeywords.split(/[,\s]+/).filter(Boolean) : []),
      ...(record?.assetFamily ? [record.assetFamily] : []),
    ],
    owner: options?.isSystem ? "system" : character.ownerId,
    source: options?.isSystem ? "system" : "user",
    status: "active",
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
    sourceRef: { entityType: "character", entityId: character.id },
    previewUrl: character.referenceImageUrl || null,
    collectionIds: [],
    downloadUrl: character.referenceImageUrl || null,
    origin: "manual",
  };
  return withSemanticContinuity(asset, record);
}

export function characterReferenceImageAsset(character: StudioCharacterListItem): StudioAsset | null {
  if (!character.referenceImageUrl?.trim()) {
    return null;
  }
  const record = extractAssetSemanticRecordFromCharacter(character);
  const asset: StudioAsset = {
    id: studioAssetId("reference_image", `char_${character.id}`),
    name: `${character.name} Reference`,
    category: "reference_image",
    description: character.referenceNotes || `Reference image for ${character.name}`,
    tags: ["reference", "character", character.slug],
    owner: character.ownerId,
    source: "user",
    status: "active",
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
    sourceRef: { entityType: "character", entityId: character.id },
    previewUrl: character.referenceImageUrl,
    collectionIds: [],
    downloadUrl: character.referenceImageUrl,
    origin: inferReferenceImageOrigin(record),
  };
  return withSemanticContinuity(asset, record);
}

export function characterMouthAssets(character: StudioCharacterListItem): StudioAsset[] {
  if (!character.mouthAnimationEnabled) {
    return [];
  }
  const mouths: Array<{ key: string; url: string; label: string }> = [
    { key: "closed", url: character.mouthClosedAssetUrl, label: "Closed" },
    { key: "small", url: character.mouthSmallAssetUrl, label: "Small" },
    { key: "medium", url: character.mouthMediumAssetUrl, label: "Medium" },
    { key: "wide", url: character.mouthWideAssetUrl, label: "Wide" },
  ];
  return mouths
    .filter((m) => m.url?.trim())
    .map((m) => ({
      id: studioAssetId("mouth_asset", `${character.id}_${m.key}`),
      name: `${character.name} Mouth ${m.label}`,
      category: "mouth_asset" as const,
      description: `Mouth overlay (${m.label}) for ${character.name}`,
      tags: ["mouth", m.key, character.slug],
      owner: character.ownerId,
      source: "user" as const,
      status: "active" as const,
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
      sourceRef: { entityType: "character", entityId: character.id },
      previewUrl: m.url,
      collectionIds: [],
    }));
}

export function locationToRegistryAsset(location: StudioLocationListItem): StudioAsset {
  const record = extractAssetSemanticRecordFromLocation(location);
  const asset: StudioAsset = {
    id: studioAssetId("location", location.id),
    name: location.name,
    category: "location",
    description: location.description || location.visualIdentity || "",
    tags: [location.category, ...location.environmentKeywords.split(/[,\s]+/).filter(Boolean)],
    owner: location.ownerId,
    source: "user",
    status: "active",
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
    sourceRef: { entityType: "location", entityId: location.id },
    previewUrl: location.referenceImageUrl || null,
    collectionIds: [],
    downloadUrl: location.referenceImageUrl || null,
    origin: "manual",
  };
  return withSemanticContinuity(asset, record);
}

export function locationReferenceImageAsset(location: StudioLocationListItem): StudioAsset | null {
  if (!location.referenceImageUrl?.trim()) {
    return null;
  }
  const record = extractAssetSemanticRecordFromLocation(location);
  const asset: StudioAsset = {
    id: studioAssetId("reference_image", `loc_${location.id}`),
    name: `${location.name} Reference`,
    category: "reference_image",
    description: `Reference image for ${location.name}`,
    tags: ["reference", "location", location.slug],
    owner: location.ownerId,
    source: "user",
    status: "active",
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
    sourceRef: { entityType: "location", entityId: location.id },
    previewUrl: location.referenceImageUrl,
    collectionIds: [],
    downloadUrl: location.referenceImageUrl,
    origin: inferReferenceImageOrigin(record),
  };
  return withSemanticContinuity(asset, record);
}

export function propToRegistryAsset(prop: StudioPropListItem): StudioAsset {
  const record = extractAssetSemanticRecordFromProp(prop);
  const asset: StudioAsset = {
    id: studioAssetId("prop", prop.id),
    name: prop.name,
    category: "prop",
    description: prop.description || "",
    tags: [prop.category, prop.slug, ...(record?.assetFamily ? [record.assetFamily] : [])],
    owner: prop.ownerId,
    source: "user",
    status: "active",
    createdAt: prop.createdAt,
    updatedAt: prop.updatedAt,
    sourceRef: { entityType: "prop", entityId: prop.id },
    previewUrl: prop.referenceImageUrl || null,
    collectionIds: [],
    downloadUrl: prop.referenceImageUrl || null,
    origin: "manual",
  };
  return withSemanticContinuity(asset, record);
}

export function sceneImageToRegistryAsset(
  scene: StudioSceneDetail,
  image: { id: string; imageUrl: string; createdAt: string; promptVersion: number }
): StudioAsset {
  return {
    id: studioAssetId("reference_image", `scene_img_${image.id}`),
    name: `${scene.title || `Scene ${scene.order + 1}`} Still`,
    category: "reference_image",
    description: `Generated scene image for ${scene.title}`,
    tags: ["scene_image", `scene_${scene.order + 1}`],
    owner: scene.storyboardId,
    source: "imported",
    status: "active",
    createdAt: image.createdAt,
    updatedAt: image.createdAt,
    sourceRef: { entityType: "scene_image", entityId: image.id },
    previewUrl: image.imageUrl,
    collectionIds: [],
    downloadUrl: image.imageUrl,
    origin: "generated",
  };
}

export function worldToRegistryAsset(world: StudioWorldProfileListItem): StudioAsset {
  return {
    id: `world:${world.id}`,
    name: world.name,
    category: "character",
    description: world.description || world.visualStyle || "",
    tags: ["world", world.slug, world.visualStyle].filter(Boolean),
    owner: world.ownerId,
    source: "user",
    status: "active",
    createdAt: world.createdAt,
    updatedAt: world.updatedAt,
    sourceRef: { entityType: "world", entityId: world.id },
    previewUrl: null,
    collectionIds: [],
    origin: "manual",
  };
}

export function generatedReferenceToRegistryAsset(item: {
  generationId: string;
  kind: string;
  createdAt: string;
  promptSummary: string;
  referenceImageUrl: string;
  referenceStorageKey: string | null;
  thumbnailUrl: string | null;
  sourceAssetName: string | null;
  origin: "generated" | "derived";
  ownerId: string;
}): StudioAsset {
  return {
    id: studioAssetId("reference_image", `gen_${item.generationId}`),
    name: item.promptSummary.slice(0, 80) || "Generated reference",
    category: "reference_image",
    description: item.sourceAssetName
      ? `From ${item.sourceAssetName}`
      : item.promptSummary,
    tags: ["generated", item.kind, item.origin],
    owner: item.ownerId,
    source: "user",
    status: "active",
    createdAt: item.createdAt,
    updatedAt: item.createdAt,
    sourceRef: { entityType: "scene_image", entityId: item.generationId },
    previewUrl: item.thumbnailUrl ?? item.referenceImageUrl,
    downloadUrl: item.referenceImageUrl,
    storageKey: item.referenceStorageKey,
    collectionIds: [],
    origin: item.origin,
    generationId: item.generationId,
    promptSummary: item.promptSummary,
  };
}

export function buildStudioAssetRegistry(params?: {
  characters?: StudioCharacterListItem[];
  locations?: StudioLocationListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
  generatedReferences?: Array<{
    generationId: string;
    kind: string;
    createdAt: string;
    promptSummary: string;
    referenceImageUrl: string;
    referenceStorageKey: string | null;
    thumbnailUrl: string | null;
    sourceAssetName: string | null;
    origin: "generated" | "derived";
    ownerId: string;
  }>;
  storyboard?: StudioStoryboardDetail;
  includeSystemCatalog?: boolean;
  userId?: string;
}): StudioAsset[] {
  const assets: StudioAsset[] = [];
  const includeSystem = params?.includeSystemCatalog !== false;

  if (includeSystem) {
    assets.push(...buildSystemAudioRegistryAssets());
    assets.push(...buildVoicePresetRegistryAssets());
    assets.push(...buildBrandAssetRegistryEntries());
  }

  for (const character of params?.characters ?? []) {
    assets.push(characterToRegistryAsset(character));
    const ref = characterReferenceImageAsset(character);
    if (ref) assets.push(ref);
    assets.push(...characterMouthAssets(character));
    if (character.voiceEnabled && character.voiceProfile) {
      assets.push({
        id: studioAssetId("voice", `char_voice_${character.id}`),
        name: `${character.name} Voice`,
        category: "voice",
        description: character.voiceDescription || character.voiceProfile,
        tags: ["character_voice", character.voiceProfile, character.voiceLanguage],
        owner: character.ownerId,
        source: "user",
        status: "active",
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
        sourceRef: { entityType: "character", entityId: character.id },
        previewUrl: null,
        collectionIds: [],
      });
    }
  }

  for (const location of params?.locations ?? []) {
    assets.push(locationToRegistryAsset(location));
    const ref = locationReferenceImageAsset(location);
    if (ref) assets.push(ref);
  }

  for (const prop of params?.props ?? []) {
    assets.push(propToRegistryAsset(prop));
    if (prop.referenceImageUrl?.trim()) {
      assets.push({
        id: studioAssetId("reference_image", `prop_${prop.id}`),
        name: `${prop.name} Reference`,
        category: "reference_image",
        description: `Reference image for ${prop.name}`,
        tags: ["reference", "prop", prop.slug],
        owner: prop.ownerId,
        source: "user",
        status: "active",
        createdAt: prop.createdAt,
        updatedAt: prop.updatedAt,
        sourceRef: { entityType: "prop", entityId: prop.id },
        previewUrl: prop.referenceImageUrl,
        collectionIds: [],
        downloadUrl: prop.referenceImageUrl,
        origin: "uploaded",
      });
    }
  }

  for (const world of params?.worlds ?? []) {
    assets.push(worldToRegistryAsset(world));
  }

  for (const gen of params?.generatedReferences ?? []) {
    assets.push(generatedReferenceToRegistryAsset(gen));
  }

  if (params?.storyboard) {
    const seen = new Set(assets.map((a) => a.id));
    for (const scene of params.storyboard.scenes) {
      for (const character of scene.characters ?? []) {
        const id = studioAssetId("character", character.id);
        if (!seen.has(id)) {
          assets.push(characterToRegistryAsset(character));
          seen.add(id);
        }
      }
      for (const loc of scene.location ? [scene.location] : []) {
        const id = studioAssetId("location", loc.id);
        if (!seen.has(id)) {
          assets.push(locationToRegistryAsset(loc));
          seen.add(id);
        }
      }
      for (const prop of scene.props ?? []) {
        const id = studioAssetId("prop", prop.id);
        if (!seen.has(id)) {
          assets.push(propToRegistryAsset(prop));
          seen.add(id);
        }
      }
      for (const img of scene.sceneImages ?? []) {
        if (img.status === "completed" && img.imageUrl) {
          const entry = sceneImageToRegistryAsset(scene, {
            id: img.id,
            imageUrl: img.imageUrl,
            createdAt: img.createdAt,
            promptVersion: img.promptVersion,
          });
          if (!seen.has(entry.id)) {
            assets.push(entry);
            seen.add(entry.id);
          }
        }
      }
    }
  }

  return assignCollectionsToAssets(assets);
}

export function getStudioAssetFromRegistry(
  registry: StudioAsset[],
  assetId: string
): StudioAsset | null {
  return registry.find((a) => a.id === assetId) ?? null;
}

export function searchStudioAssetRegistry(params: {
  registry: StudioAsset[];
  category?: StudioAssetCategory | "all";
  query?: string;
  collectionId?: string;
}): StudioAsset[] {
  const q = (params.query ?? "").trim().toLowerCase();
  return params.registry.filter((asset) => {
    if (params.category && params.category !== "all" && asset.category !== params.category) {
      return false;
    }
    if (params.collectionId && !asset.collectionIds.includes(params.collectionId)) {
      return false;
    }
    if (!q) return true;
    const hay = [asset.name, asset.description, ...asset.tags].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function buildRegistrySummary(assets: StudioAsset[]): string {
  if (assets.length === 0) return "";
  const counts = new Map<StudioAssetCategory, number>();
  for (const a of assets) {
    counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([cat, n]) => `${n} ${cat}`)
    .join(" · ");
}
