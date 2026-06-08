import { normalizeStudioContinuityStrength } from "@/lib/studio-continuity-strength";
import { strictestContinuityStrength } from "@/lib/studio-continuity-strength";
import { buildCanonicalCharacterIdentity } from "@/lib/studio-character-canonical-references";
import type {
  CharacterMemorySnapshot,
  LocationMemorySnapshot,
  PropMemorySnapshot,
  SceneMemoryBundle,
  WorldMemorySnapshot,
} from "@/types/studio-memory-snapshots";
import type { CharacterSnapshot } from "@/types/studio-character-snapshot";
import type { LocationSnapshot } from "@/types/studio-location-snapshot";
import type { PropSnapshot } from "@/types/studio-prop-snapshot";

type WorldProfilePick = {
  id: string;
  name: string;
  description: string;
  visualStyle: string;
  tone: string;
  continuityRules: string;
  continuityStrength: string;
};

type CharacterRow = {
  id: string;
  name: string;
  role: string;
  description: string;
  personality: string;
  referenceImageUrl: string;
  referenceStorageKey?: string;
  appearanceMemory: string;
  personalityMemory: string;
  continuityNotes: string;
  defaultClothing: string;
  defaultAccessories: string;
  visualKeywords: string;
  primaryReferenceImageId: string | null;
  referenceNotes: string;
  identityStrength: string;
  continuityStrength: string;
  worldProfileId: string | null;
  worldProfile?: WorldProfilePick | null;
};

type LocationRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  referenceImageUrl: string;
  worldMemory: string;
  visualIdentity: string;
  environmentKeywords: string;
  continuityNotes: string;
  continuityStrength: string;
  worldProfileId: string | null;
  worldProfile?: WorldProfilePick | null;
};

type PropRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  referenceImageUrl: string;
  appearanceMemory: string;
  brandingRules: string;
  continuityNotes: string;
  continuityStrength: string;
  worldProfileId: string | null;
  worldProfile?: WorldProfilePick | null;
};

export function toWorldMemorySnapshot(row: WorldProfilePick): WorldMemorySnapshot {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    visualStyle: row.visualStyle,
    tone: row.tone,
    continuityRules: row.continuityRules,
    continuityStrength: normalizeStudioContinuityStrength(row.continuityStrength),
  };
}

export function toCharacterMemorySnapshot(row: CharacterRow): CharacterMemorySnapshot {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    appearanceMemory: row.appearanceMemory,
    personalityMemory: row.personalityMemory || row.personality,
    continuityNotes: row.continuityNotes,
    defaultClothing: row.defaultClothing,
    defaultAccessories: row.defaultAccessories,
    visualKeywords: row.visualKeywords,
    referenceImageUrl: row.referenceImageUrl,
    primaryReferenceImageId: row.primaryReferenceImageId ?? row.id,
    referenceNotes: row.referenceNotes,
    identityStrength: normalizeStudioContinuityStrength(row.identityStrength),
    continuityStrength: normalizeStudioContinuityStrength(row.continuityStrength),
    worldProfileId: row.worldProfileId,
    worldProfileName: row.worldProfile?.name ?? null,
    canonicalIdentity: buildCanonicalCharacterIdentity({
      id: row.id,
      referenceImageUrl: row.referenceImageUrl,
      referenceStorageKey: row.referenceStorageKey ?? "",
      primaryReferenceImageId: row.primaryReferenceImageId,
      referenceNotes: row.referenceNotes,
      visualKeywords: row.visualKeywords,
      defaultClothing: row.defaultClothing,
      name: row.name,
      role: row.role,
      description: row.description,
      personality: row.personality,
      appearanceMemory: row.appearanceMemory,
      worldProfileId: row.worldProfileId,
      worldProfile: row.worldProfile,
    }),
  };
}

export function toLocationMemorySnapshot(row: LocationRow): LocationMemorySnapshot {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    worldMemory: row.worldMemory,
    visualIdentity: row.visualIdentity,
    environmentKeywords: row.environmentKeywords,
    continuityNotes: row.continuityNotes,
    referenceImageUrl: row.referenceImageUrl,
    continuityStrength: normalizeStudioContinuityStrength(row.continuityStrength),
    worldProfileId: row.worldProfileId,
    worldProfileName: row.worldProfile?.name ?? null,
  };
}

export function toPropMemorySnapshot(row: PropRow): PropMemorySnapshot {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    appearanceMemory: row.appearanceMemory,
    brandingRules: row.brandingRules,
    continuityNotes: row.continuityNotes,
    referenceImageUrl: row.referenceImageUrl,
    continuityStrength: normalizeStudioContinuityStrength(row.continuityStrength),
    worldProfileId: row.worldProfileId,
    worldProfileName: row.worldProfile?.name ?? null,
  };
}

export function buildSceneMemoryBundle(params: {
  characters: CharacterRow[];
  location: LocationRow | null;
  props: PropRow[];
}): SceneMemoryBundle {
  const characterMemories = params.characters.map(toCharacterMemorySnapshot);
  const locationMemory = params.location ? toLocationMemorySnapshot(params.location) : null;
  const propMemories = params.props.map(toPropMemorySnapshot);

  const worldCandidates = new Map<string, WorldMemorySnapshot>();
  for (const row of [
    ...params.characters,
    ...(params.location ? [params.location] : []),
    ...params.props,
  ]) {
    if (row.worldProfile) {
      worldCandidates.set(row.worldProfile.id, toWorldMemorySnapshot(row.worldProfile));
    }
  }
  const worlds = [...worldCandidates.values()];
  const world = worlds.length === 1 ? worlds[0]! : worlds[0] ?? null;

  const strengths = [
    ...characterMemories.map((c) => c.continuityStrength),
    ...characterMemories.map((c) => c.identityStrength),
    locationMemory?.continuityStrength,
    ...propMemories.map((p) => p.continuityStrength),
    world?.continuityStrength,
  ];

  return {
    characters: characterMemories,
    location: locationMemory,
    props: propMemories,
    world,
    continuityStrength: strictestContinuityStrength(strengths),
  };
}

/** Build bundle from portable scene snapshots (client preview; memory fields may be empty). */
export function buildSceneMemoryBundleFromSnapshots(params: {
  characters: CharacterSnapshot[];
  location: LocationSnapshot | null;
  props: PropSnapshot[];
}): SceneMemoryBundle {
  return buildSceneMemoryBundle({
    characters: params.characters.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      description: c.description,
      personality: c.personality,
      referenceImageUrl: c.referenceImageUrl,
      referenceStorageKey: "",
      appearanceMemory: "",
      personalityMemory: c.personality,
      continuityNotes: "",
      defaultClothing: "",
      defaultAccessories: "",
      visualKeywords: "",
      primaryReferenceImageId: c.id,
      referenceNotes: "",
      identityStrength: "strong",
      continuityStrength: "strong",
      worldProfileId: null,
      worldProfile: null,
    })),
    location: params.location
      ? {
          id: params.location.id,
          name: params.location.name,
          category: params.location.category,
          description: params.location.description,
          referenceImageUrl: params.location.referenceImageUrl,
          worldMemory: "",
          visualIdentity: "",
          environmentKeywords: "",
          continuityNotes: "",
          continuityStrength: "strong",
          worldProfileId: null,
          worldProfile: null,
        }
      : null,
    props: params.props.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      referenceImageUrl: p.referenceImageUrl,
      appearanceMemory: "",
      brandingRules: "",
      continuityNotes: "",
      continuityStrength: "strong",
      worldProfileId: null,
      worldProfile: null,
    })),
  });
}
