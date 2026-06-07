/**
 * Per-kind Identity Spec ↔ entity field mapping (no persistence).
 */

import { normalizeStudioContinuityStrength } from "@/lib/studio-continuity-strength";
import { normalizeStudioIdentityStrength } from "@/lib/studio-memory-validation";
import {
  extractPropStructuredKeywordString,
  parsePropAppearanceDetails,
} from "@/lib/studio-prop-identity-structured";
import type {
  StudioCharacterDetail,
  StudioCharacterListItem,
  StudioLocationDetail,
  StudioLocationListItem,
  StudioPropDetail,
  StudioPropListItem,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type {
  CharacterMemorySnapshot,
  LocationMemorySnapshot,
  PropMemorySnapshot,
  WorldMemorySnapshot,
} from "@/types/studio-memory-snapshots";
import type {
  CharacterIdentitySpec,
  CharacterIdentitySpecPatch,
  IdentityReference,
  IdentitySpec,
  IdentitySpecKind,
  LocationIdentitySpec,
  LocationIdentitySpecPatch,
  PropIdentitySpec,
  PropIdentitySpecPatch,
  WorldIdentitySpec,
  WorldIdentitySpecPatch,
} from "@/types/studio-identity-spec";

function joinNonEmpty(parts: string[], separator = " "): string {
  return parts.map((p) => p.trim()).filter(Boolean).join(separator).trim();
}

function splitKeywordTags(keywords: string): string[] {
  if (!keywords.trim()) return [];
  return keywords.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
}

function buildCharacterTags(character: StudioCharacterListItem): string[] {
  const tags: string[] = [character.role];
  if (character.isMascot) tags.push("mascot");
  tags.push(...splitKeywordTags(character.visualKeywords));
  return [...new Set(tags)];
}

function buildLocationTags(location: StudioLocationListItem): string[] {
  return [location.category, ...splitKeywordTags(location.environmentKeywords)];
}

function buildPropTags(prop: StudioPropListItem): string[] {
  const tags = [prop.category, prop.slug];
  tags.push(...splitKeywordTags(parsePropAppearanceDetails(prop.appearanceMemory)));
  return [...new Set(tags)];
}

function buildCharacterVisualRules(character: StudioCharacterListItem): string {
  return joinNonEmpty([
    character.appearanceMemory,
    character.visualKeywords,
    character.defaultClothing,
    character.defaultAccessories,
  ]);
}

function buildLocationVisualRules(location: StudioLocationListItem): string {
  return joinNonEmpty([
    location.visualIdentity,
    location.environmentKeywords,
    location.worldMemory,
  ]);
}

function buildPropVisualRules(prop: StudioPropListItem): string {
  return joinNonEmpty([
    parsePropAppearanceDetails(prop.appearanceMemory),
    prop.brandingRules,
  ]);
}

function buildWorldVisualRules(world: StudioWorldProfileListItem): string {
  return joinNonEmpty([world.visualStyle, world.continuityRules]);
}

function primaryReference(
  url: string,
  storageKey: string | undefined,
  notes: string
): IdentityReference[] {
  if (!url.trim()) return [];
  return [
    {
      url,
      storageKey: storageKey || undefined,
      role: "primary",
      notes: notes.trim() || undefined,
    },
  ];
}

function characterMouthReferences(character: StudioCharacterListItem): IdentityReference[] {
  const refs: IdentityReference[] = [];
  const pairs: Array<[string, IdentityReference["role"]]> = [
    [character.mouthClosedAssetUrl, "mouth_closed"],
    [character.mouthSmallAssetUrl, "mouth_small"],
    [character.mouthMediumAssetUrl, "mouth_medium"],
    [character.mouthWideAssetUrl, "mouth_wide"],
  ];
  for (const [url, role] of pairs) {
    if (url.trim()) refs.push({ url, role });
  }
  return refs;
}

export function characterToIdentitySpec(
  character: StudioCharacterListItem | StudioCharacterDetail
): CharacterIdentitySpec {
  const storageKey =
    "referenceStorageKey" in character ? character.referenceStorageKey : undefined;

  return {
    kind: "character",
    id: character.id,
    name: character.name,
    type: character.role,
    role: character.role,
    description: character.description,
    personality: character.personality,
    visualKeywords: character.visualKeywords,
    visualRules: buildCharacterVisualRules(character),
    tags: buildCharacterTags(character),
    references: [
      ...primaryReference(
        character.referenceImageUrl,
        storageKey,
        character.referenceNotes
      ),
      ...characterMouthReferences(character),
    ],
    world: {
      id: character.worldProfileId,
      name: character.worldProfile?.name ?? null,
    },
    usageContext: character.continuityNotes,
    forbiddenElements: "",
    continuityMetadata: {
      notes: character.continuityNotes,
      continuityStrength: character.continuityStrength,
      identityStrength: character.identityStrength,
    },
    memoryMetadata: {
      appearanceMemory: character.appearanceMemory,
      personalityMemory: character.personalityMemory,
      defaultClothing: character.defaultClothing,
      defaultAccessories: character.defaultAccessories,
      primaryReferenceImageId: character.primaryReferenceImageId,
      referenceNotes: character.referenceNotes,
    },
    voice: {
      enabled: character.voiceEnabled,
      provider: character.voiceProvider,
      profile: character.voiceProfile,
      language: character.voiceLanguage,
      gender: character.voiceGender,
      description: character.voiceDescription,
      notes: character.voiceNotes,
      lock: character.voiceLock,
    },
    isMascot: character.isMascot,
  };
}

export function locationToIdentitySpec(
  location: StudioLocationListItem | StudioLocationDetail
): LocationIdentitySpec {
  const storageKey =
    "referenceStorageKey" in location ? location.referenceStorageKey : undefined;

  return {
    kind: "location",
    id: location.id,
    name: location.name,
    type: location.category,
    role: "",
    description: location.description,
    personality: "",
    visualKeywords: location.environmentKeywords,
    visualRules: buildLocationVisualRules(location),
    tags: buildLocationTags(location),
    references: primaryReference(location.referenceImageUrl, storageKey, ""),
    world: {
      id: location.worldProfileId,
      name: location.worldProfile?.name ?? null,
    },
    usageContext: location.continuityNotes,
    forbiddenElements: "",
    continuityMetadata: {
      notes: location.continuityNotes,
      continuityStrength: location.continuityStrength,
    },
    memoryMetadata: {
      worldMemory: location.worldMemory,
      visualIdentity: location.visualIdentity,
      environmentKeywords: location.environmentKeywords,
    },
  };
}

export function propToIdentitySpec(
  prop: StudioPropListItem | StudioPropDetail
): PropIdentitySpec {
  const storageKey = "referenceStorageKey" in prop ? prop.referenceStorageKey : undefined;

  return {
    kind: "prop",
    id: prop.id,
    name: prop.name,
    type: prop.category,
    role: "",
    description: prop.description,
    personality: "",
    visualKeywords: extractPropStructuredKeywordString(prop.appearanceMemory),
    visualRules: buildPropVisualRules(prop),
    tags: buildPropTags(prop),
    references: primaryReference(prop.referenceImageUrl, storageKey, ""),
    world: {
      id: prop.worldProfileId,
      name: prop.worldProfile?.name ?? null,
    },
    usageContext: prop.continuityNotes,
    forbiddenElements: prop.brandingRules,
    continuityMetadata: {
      notes: prop.continuityNotes,
      continuityStrength: prop.continuityStrength,
    },
    memoryMetadata: {
      appearanceMemory: prop.appearanceMemory,
      brandingRules: prop.brandingRules,
    },
  };
}

export function worldToIdentitySpec(world: StudioWorldProfileListItem): WorldIdentitySpec {
  return {
    kind: "world",
    id: world.id,
    name: world.name,
    type: "",
    role: "",
    description: world.description,
    personality: world.tone,
    visualKeywords: "",
    visualRules: buildWorldVisualRules(world),
    tags: [],
    references: [],
    world: { id: world.id, name: world.name },
    usageContext: world.continuityRules,
    forbiddenElements: world.continuityRules,
    continuityMetadata: {
      notes: world.continuityRules,
      continuityStrength: world.continuityStrength,
    },
    memoryMetadata: {
      visualStyle: world.visualStyle,
      tone: world.tone,
      continuityRules: world.continuityRules,
    },
  };
}

export function characterMemorySnapshotToIdentitySpec(
  snapshot: CharacterMemorySnapshot
): CharacterIdentitySpec {
  return {
    kind: "character",
    id: snapshot.id,
    name: snapshot.name,
    type: snapshot.role,
    role: snapshot.role,
    description: "",
    personality: snapshot.personalityMemory,
    visualKeywords: snapshot.visualKeywords,
    visualRules: joinNonEmpty([
      snapshot.appearanceMemory,
      snapshot.visualKeywords,
      snapshot.defaultClothing,
      snapshot.defaultAccessories,
    ]),
    tags: [snapshot.role, ...splitKeywordTags(snapshot.visualKeywords)],
    references: primaryReference(snapshot.referenceImageUrl, undefined, snapshot.referenceNotes),
    world: {
      id: snapshot.worldProfileId,
      name: snapshot.worldProfileName,
    },
    usageContext: snapshot.continuityNotes,
    forbiddenElements: "",
    continuityMetadata: {
      notes: snapshot.continuityNotes,
      continuityStrength: snapshot.continuityStrength,
      identityStrength: normalizeStudioIdentityStrength(snapshot.identityStrength),
    },
    memoryMetadata: {
      appearanceMemory: snapshot.appearanceMemory,
      personalityMemory: snapshot.personalityMemory,
      defaultClothing: snapshot.defaultClothing,
      defaultAccessories: snapshot.defaultAccessories,
      primaryReferenceImageId: snapshot.primaryReferenceImageId,
      referenceNotes: snapshot.referenceNotes,
    },
    isMascot: snapshot.role === "mascot",
  };
}

export function locationMemorySnapshotToIdentitySpec(
  snapshot: LocationMemorySnapshot
): LocationIdentitySpec {
  return {
    kind: "location",
    id: snapshot.id,
    name: snapshot.name,
    type: snapshot.category,
    role: "",
    description: "",
    personality: "",
    visualKeywords: snapshot.environmentKeywords,
    visualRules: joinNonEmpty([
      snapshot.visualIdentity,
      snapshot.environmentKeywords,
      snapshot.worldMemory,
    ]),
    tags: [snapshot.category, ...splitKeywordTags(snapshot.environmentKeywords)],
    references: primaryReference(snapshot.referenceImageUrl, undefined, ""),
    world: {
      id: snapshot.worldProfileId,
      name: snapshot.worldProfileName,
    },
    usageContext: snapshot.continuityNotes,
    forbiddenElements: "",
    continuityMetadata: {
      notes: snapshot.continuityNotes,
      continuityStrength: snapshot.continuityStrength,
    },
    memoryMetadata: {
      worldMemory: snapshot.worldMemory,
      visualIdentity: snapshot.visualIdentity,
      environmentKeywords: snapshot.environmentKeywords,
    },
  };
}

export function propMemorySnapshotToIdentitySpec(snapshot: PropMemorySnapshot): PropIdentitySpec {
  return {
    kind: "prop",
    id: snapshot.id,
    name: snapshot.name,
    type: snapshot.category,
    role: "",
    description: "",
    personality: "",
    visualKeywords: "",
    visualRules: joinNonEmpty([snapshot.appearanceMemory, snapshot.brandingRules]),
    tags: [snapshot.category, ...splitKeywordTags(snapshot.appearanceMemory)],
    references: primaryReference(snapshot.referenceImageUrl, undefined, ""),
    world: {
      id: snapshot.worldProfileId,
      name: snapshot.worldProfileName,
    },
    usageContext: snapshot.continuityNotes,
    forbiddenElements: snapshot.brandingRules,
    continuityMetadata: {
      notes: snapshot.continuityNotes,
      continuityStrength: snapshot.continuityStrength,
    },
    memoryMetadata: {
      appearanceMemory: snapshot.appearanceMemory,
      brandingRules: snapshot.brandingRules,
    },
  };
}

export function worldMemorySnapshotToIdentitySpec(
  snapshot: WorldMemorySnapshot
): WorldIdentitySpec {
  return {
    kind: "world",
    id: snapshot.id,
    name: snapshot.name,
    type: "",
    role: "",
    description: snapshot.description,
    personality: snapshot.tone,
    visualKeywords: "",
    visualRules: joinNonEmpty([snapshot.visualStyle, snapshot.continuityRules]),
    tags: [],
    references: [],
    world: { id: snapshot.id, name: snapshot.name },
    usageContext: snapshot.continuityRules,
    forbiddenElements: snapshot.continuityRules,
    continuityMetadata: {
      notes: snapshot.continuityRules,
      continuityStrength: snapshot.continuityStrength,
    },
    memoryMetadata: {
      visualStyle: snapshot.visualStyle,
      tone: snapshot.tone,
      continuityRules: snapshot.continuityRules,
    },
  };
}

export function identitySpecKindOf(entity: {
  kind?: IdentitySpecKind;
}): IdentitySpecKind | null {
  return entity.kind ?? null;
}

export function characterFromIdentitySpec(spec: CharacterIdentitySpec): CharacterIdentitySpecPatch {
  const primary = spec.references.find((r) => r.role === "primary");

  return {
    name: spec.name,
    role: spec.role,
    description: spec.description,
    personality: spec.personality,
    referenceImageUrl: primary?.url,
    referenceStorageKey: primary?.storageKey,
    appearanceMemory: spec.memoryMetadata.appearanceMemory,
    personalityMemory: spec.memoryMetadata.personalityMemory || spec.personality,
    continuityNotes: spec.continuityMetadata.notes,
    defaultClothing: spec.memoryMetadata.defaultClothing,
    defaultAccessories: spec.memoryMetadata.defaultAccessories,
    visualKeywords: spec.visualKeywords,
    primaryReferenceImageId: spec.memoryMetadata.primaryReferenceImageId,
    referenceNotes: spec.memoryMetadata.referenceNotes || primary?.notes,
    identityStrength: spec.continuityMetadata.identityStrength,
    continuityStrength: spec.continuityMetadata.continuityStrength,
    worldProfileId: spec.world.id,
  };
}

export function locationFromIdentitySpec(spec: LocationIdentitySpec): LocationIdentitySpecPatch {
  const primary = spec.references.find((r) => r.role === "primary");
  return {
    name: spec.name,
    category: spec.type,
    description: spec.description,
    referenceImageUrl: primary?.url,
    referenceStorageKey: primary?.storageKey,
    worldMemory: spec.memoryMetadata.worldMemory,
    visualIdentity: spec.memoryMetadata.visualIdentity,
    environmentKeywords: spec.visualKeywords || spec.memoryMetadata.environmentKeywords,
    continuityNotes: spec.continuityMetadata.notes,
    continuityStrength: spec.continuityMetadata.continuityStrength,
    worldProfileId: spec.world.id,
  };
}

export function propFromIdentitySpec(spec: PropIdentitySpec): PropIdentitySpecPatch {
  const primary = spec.references.find((r) => r.role === "primary");
  return {
    name: spec.name,
    category: spec.type,
    description: spec.description,
    referenceImageUrl: primary?.url,
    referenceStorageKey: primary?.storageKey,
    appearanceMemory: spec.memoryMetadata.appearanceMemory,
    brandingRules: spec.forbiddenElements || spec.memoryMetadata.brandingRules,
    continuityNotes: spec.continuityMetadata.notes,
    continuityStrength: spec.continuityMetadata.continuityStrength,
    worldProfileId: spec.world.id,
  };
}

export function worldFromIdentitySpec(spec: WorldIdentitySpec): WorldIdentitySpecPatch {
  return {
    name: spec.name,
    description: spec.description,
    visualStyle: spec.memoryMetadata.visualStyle,
    tone: spec.personality || spec.memoryMetadata.tone,
    continuityRules: spec.memoryMetadata.continuityRules,
    continuityStrength: spec.continuityMetadata.continuityStrength,
  };
}

/** Row shapes consumed by studio-memory-mappers (reuse without modifying that module). */
export function identitySpecToCharacterRow(
  spec: CharacterIdentitySpec
): Parameters<typeof import("@/lib/studio-memory-mappers").toCharacterMemorySnapshot>[0] {
  const primary = spec.references.find((r) => r.role === "primary");
  return {
    id: spec.id,
    name: spec.name,
    role: spec.role,
    description: spec.description,
    personality: spec.personality,
    referenceImageUrl: primary?.url ?? "",
    appearanceMemory: spec.memoryMetadata.appearanceMemory,
    personalityMemory: spec.memoryMetadata.personalityMemory || spec.personality,
    continuityNotes: spec.continuityMetadata.notes,
    defaultClothing: spec.memoryMetadata.defaultClothing,
    defaultAccessories: spec.memoryMetadata.defaultAccessories,
    visualKeywords: spec.visualKeywords,
    primaryReferenceImageId: spec.memoryMetadata.primaryReferenceImageId,
    referenceNotes: spec.memoryMetadata.referenceNotes,
    identityStrength: spec.continuityMetadata.identityStrength ?? "strong",
    continuityStrength: spec.continuityMetadata.continuityStrength,
    worldProfileId: spec.world.id,
    worldProfile: spec.world.id
      ? {
          id: spec.world.id,
          name: spec.world.name ?? "",
          description: "",
          visualStyle: "",
          tone: "",
          continuityRules: "",
          continuityStrength: spec.continuityMetadata.continuityStrength,
        }
      : null,
  };
}

export function identitySpecToLocationRow(
  spec: LocationIdentitySpec
): Parameters<typeof import("@/lib/studio-memory-mappers").toLocationMemorySnapshot>[0] {
  const primary = spec.references.find((r) => r.role === "primary");
  return {
    id: spec.id,
    name: spec.name,
    category: spec.type,
    description: spec.description,
    referenceImageUrl: primary?.url ?? "",
    worldMemory: spec.memoryMetadata.worldMemory,
    visualIdentity: spec.memoryMetadata.visualIdentity,
    environmentKeywords: spec.visualKeywords || spec.memoryMetadata.environmentKeywords,
    continuityNotes: spec.continuityMetadata.notes,
    continuityStrength: spec.continuityMetadata.continuityStrength,
    worldProfileId: spec.world.id,
    worldProfile: spec.world.id
      ? {
          id: spec.world.id,
          name: spec.world.name ?? "",
          description: "",
          visualStyle: "",
          tone: "",
          continuityRules: "",
          continuityStrength: spec.continuityMetadata.continuityStrength,
        }
      : null,
  };
}

export function identitySpecToPropRow(
  spec: PropIdentitySpec
): Parameters<typeof import("@/lib/studio-memory-mappers").toPropMemorySnapshot>[0] {
  const primary = spec.references.find((r) => r.role === "primary");
  return {
    id: spec.id,
    name: spec.name,
    category: spec.type,
    description: spec.description,
    referenceImageUrl: primary?.url ?? "",
    appearanceMemory: spec.memoryMetadata.appearanceMemory,
    brandingRules: spec.memoryMetadata.brandingRules,
    continuityNotes: spec.continuityMetadata.notes,
    continuityStrength: spec.continuityMetadata.continuityStrength,
    worldProfileId: spec.world.id,
    worldProfile: spec.world.id
      ? {
          id: spec.world.id,
          name: spec.world.name ?? "",
          description: "",
          visualStyle: "",
          tone: "",
          continuityRules: "",
          continuityStrength: spec.continuityMetadata.continuityStrength,
        }
      : null,
  };
}

export function identitySpecToWorldRow(
  spec: WorldIdentitySpec
): Parameters<typeof import("@/lib/studio-memory-mappers").toWorldMemorySnapshot>[0] {
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    visualStyle: spec.memoryMetadata.visualStyle,
    tone: spec.personality || spec.memoryMetadata.tone,
    continuityRules: spec.memoryMetadata.continuityRules,
    continuityStrength: spec.continuityMetadata.continuityStrength,
  };
}

export function normalizeContinuityFromSpec(
  strength: string | undefined
): ReturnType<typeof normalizeStudioContinuityStrength> {
  return normalizeStudioContinuityStrength(strength ?? "strong");
}

export type IdentitySpecEntitySource =
  | { kind: "character"; entity: StudioCharacterListItem | StudioCharacterDetail }
  | { kind: "location"; entity: StudioLocationListItem | StudioLocationDetail }
  | { kind: "prop"; entity: StudioPropListItem | StudioPropDetail }
  | { kind: "world"; entity: StudioWorldProfileListItem };

export function entitySourceToIdentitySpec(source: IdentitySpecEntitySource): IdentitySpec {
  switch (source.kind) {
    case "character":
      return characterToIdentitySpec(source.entity);
    case "location":
      return locationToIdentitySpec(source.entity);
    case "prop":
      return propToIdentitySpec(source.entity);
    case "world":
      return worldToIdentitySpec(source.entity);
  }
}
