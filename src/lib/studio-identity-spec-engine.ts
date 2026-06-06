/**
 * Studio V2 — Identity Spec Engine (shared facade for character/location/prop/world identity).
 * Maps existing DB + memory fields; no schema migration, no UI, no generation changes.
 */

import {
  toCharacterMemorySnapshot,
  toLocationMemorySnapshot,
  toPropMemorySnapshot,
  toWorldMemorySnapshot,
} from "@/lib/studio-memory-mappers";
import {
  characterFromIdentitySpec,
  characterMemorySnapshotToIdentitySpec,
  characterToIdentitySpec,
  entitySourceToIdentitySpec,
  identitySpecToCharacterRow,
  identitySpecToLocationRow,
  identitySpecToPropRow,
  identitySpecToWorldRow,
  locationFromIdentitySpec,
  locationMemorySnapshotToIdentitySpec,
  locationToIdentitySpec,
  propFromIdentitySpec,
  propMemorySnapshotToIdentitySpec,
  propToIdentitySpec,
  worldFromIdentitySpec,
  worldMemorySnapshotToIdentitySpec,
  worldToIdentitySpec,
  type IdentitySpecEntitySource,
} from "@/lib/studio-identity-spec-mappers";
import type {
  StudioCharacterDetail,
  StudioCharacterListItem,
  StudioLocationDetail,
  StudioLocationListItem,
  StudioPropDetail,
  StudioPropListItem,
  StudioSceneDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { CharacterSnapshot } from "@/types/studio-character-snapshot";
import type { LocationSnapshot } from "@/types/studio-location-snapshot";
import type { PropSnapshot } from "@/types/studio-prop-snapshot";
import type {
  CharacterMemorySnapshot,
  LocationMemorySnapshot,
  PropMemorySnapshot,
  WorldMemorySnapshot,
} from "@/types/studio-memory-snapshots";
import type {
  CharacterIdentitySpec,
  IdentityMemorySnapshot,
  IdentitySearchHaystack,
  IdentitySpec,
  IdentitySpecKind,
  IdentitySpecPatch,
  LocationIdentitySpec,
  PropIdentitySpec,
  WorldIdentitySpec,
} from "@/types/studio-identity-spec";

export type { IdentitySpecEntitySource } from "@/lib/studio-identity-spec-mappers";
export type {
  CharacterIdentitySpec,
  IdentityReference,
  IdentitySearchHaystack,
  IdentitySpec,
  IdentitySpecBase,
  IdentitySpecKind,
  IdentitySpecPatch,
  IdentityVoiceReference,
  IdentityWorldLink,
} from "@/types/studio-identity-spec";

// ---------------------------------------------------------------------------
// Adapters: entity ↔ IdentitySpec
// ---------------------------------------------------------------------------

export function toIdentitySpec(
  character: StudioCharacterListItem | StudioCharacterDetail
): CharacterIdentitySpec;
export function toIdentitySpec(
  location: StudioLocationListItem | StudioLocationDetail
): LocationIdentitySpec;
export function toIdentitySpec(prop: StudioPropListItem | StudioPropDetail): PropIdentitySpec;
export function toIdentitySpec(world: StudioWorldProfileListItem): WorldIdentitySpec;
export function toIdentitySpec(source: IdentitySpecEntitySource): IdentitySpec;
export function toIdentitySpec(
  entity:
    | StudioCharacterListItem
    | StudioCharacterDetail
    | StudioLocationListItem
    | StudioLocationDetail
    | StudioPropListItem
    | StudioPropDetail
    | StudioWorldProfileListItem
    | IdentitySpecEntitySource
): IdentitySpec {
  if (typeof entity === "object" && entity !== null && "kind" in entity && "entity" in entity) {
    return entitySourceToIdentitySpec(entity);
  }
  if ("role" in entity && "personality" in entity) {
    return characterToIdentitySpec(entity);
  }
  if ("category" in entity && "environmentKeywords" in entity) {
    return locationToIdentitySpec(entity);
  }
  if ("category" in entity && "brandingRules" in entity) {
    return propToIdentitySpec(entity);
  }
  return worldToIdentitySpec(entity as StudioWorldProfileListItem);
}

export function fromIdentitySpec(spec: CharacterIdentitySpec): IdentitySpecPatch;
export function fromIdentitySpec(spec: LocationIdentitySpec): IdentitySpecPatch;
export function fromIdentitySpec(spec: PropIdentitySpec): IdentitySpecPatch;
export function fromIdentitySpec(spec: WorldIdentitySpec): IdentitySpecPatch;
export function fromIdentitySpec(spec: IdentitySpec): IdentitySpecPatch {
  switch (spec.kind) {
    case "character":
      return { kind: "character", patch: characterFromIdentitySpec(spec) };
    case "location":
      return { kind: "location", patch: locationFromIdentitySpec(spec) };
    case "prop":
      return { kind: "prop", patch: propFromIdentitySpec(spec) };
    case "world":
      return { kind: "world", patch: worldFromIdentitySpec(spec) };
  }
}

// ---------------------------------------------------------------------------
// Memory integration (delegates to studio-memory-mappers)
// ---------------------------------------------------------------------------

export function toMemorySnapshot(spec: CharacterIdentitySpec): CharacterMemorySnapshot;
export function toMemorySnapshot(spec: LocationIdentitySpec): LocationMemorySnapshot;
export function toMemorySnapshot(spec: PropIdentitySpec): PropMemorySnapshot;
export function toMemorySnapshot(spec: WorldIdentitySpec): WorldMemorySnapshot;
export function toMemorySnapshot(spec: IdentitySpec): IdentityMemorySnapshot;
export function toMemorySnapshot(spec: IdentitySpec): IdentityMemorySnapshot {
  switch (spec.kind) {
    case "character":
      return toCharacterMemorySnapshot(identitySpecToCharacterRow(spec));
    case "location":
      return toLocationMemorySnapshot(identitySpecToLocationRow(spec));
    case "prop":
      return toPropMemorySnapshot(identitySpecToPropRow(spec));
    case "world":
      return toWorldMemorySnapshot(identitySpecToWorldRow(spec));
  }
}

export function fromMemorySnapshot(snapshot: CharacterMemorySnapshot): CharacterIdentitySpec;
export function fromMemorySnapshot(snapshot: LocationMemorySnapshot): LocationIdentitySpec;
export function fromMemorySnapshot(snapshot: PropMemorySnapshot): PropIdentitySpec;
export function fromMemorySnapshot(snapshot: WorldMemorySnapshot): WorldIdentitySpec;
export function fromMemorySnapshot(snapshot: IdentityMemorySnapshot): IdentitySpec;
export function fromMemorySnapshot(snapshot: IdentityMemorySnapshot): IdentitySpec {
  if ("role" in snapshot && "visualKeywords" in snapshot) {
    return characterMemorySnapshotToIdentitySpec(snapshot);
  }
  if ("environmentKeywords" in snapshot) {
    return locationMemorySnapshotToIdentitySpec(snapshot);
  }
  if ("brandingRules" in snapshot) {
    return propMemorySnapshotToIdentitySpec(snapshot);
  }
  return worldMemorySnapshotToIdentitySpec(snapshot);
}

// ---------------------------------------------------------------------------
// Search & matching
// ---------------------------------------------------------------------------

export function mergePersonality(spec: IdentitySpec): string {
  if (spec.kind === "character") {
    const memory = spec.memoryMetadata.personalityMemory.trim();
    const base = spec.personality.trim();
    return memory || base;
  }
  if (spec.kind === "world") {
    return spec.personality.trim() || spec.memoryMetadata.tone.trim();
  }
  return spec.personality.trim();
}

export function toSearchHaystack(spec: IdentitySpec): IdentitySearchHaystack {
  const personality = mergePersonality(spec);
  const extraFields: string[] = [spec.visualRules, spec.visualKeywords, spec.continuityMetadata.notes];

  switch (spec.kind) {
    case "character": {
      extraFields.push(
        spec.memoryMetadata.appearanceMemory,
        spec.memoryMetadata.defaultClothing,
        spec.memoryMetadata.defaultAccessories
      );
      if (spec.voice?.profile.trim()) extraFields.push(spec.voice.profile);
      const fullText = [
        spec.name,
        spec.description,
        personality,
        spec.type,
        ...extraFields,
      ]
        .filter(Boolean)
        .join(" ");
      return {
        name: spec.name,
        description: spec.description,
        category: spec.type,
        extraFields: extraFields.filter(Boolean),
        fullText,
      };
    }
    case "location": {
      extraFields.push(
        spec.memoryMetadata.visualIdentity,
        spec.memoryMetadata.worldMemory
      );
      const fullText = [spec.name, spec.description, spec.type, ...extraFields]
        .filter(Boolean)
        .join(" ");
      return {
        name: spec.name,
        description: spec.description,
        category: spec.type,
        extraFields: extraFields.filter(Boolean),
        fullText,
      };
    }
    case "prop": {
      extraFields.push(
        spec.memoryMetadata.appearanceMemory,
        spec.memoryMetadata.brandingRules
      );
      const fullText = [spec.name, spec.description, spec.type, ...extraFields]
        .filter(Boolean)
        .join(" ");
      return {
        name: spec.name,
        description: spec.description,
        category: spec.type,
        extraFields: extraFields.filter(Boolean),
        fullText,
      };
    }
    case "world": {
      extraFields.push(
        spec.memoryMetadata.visualStyle,
        spec.memoryMetadata.continuityRules,
        spec.memoryMetadata.tone
      );
      const fullText = [spec.name, spec.description, spec.memoryMetadata.visualStyle, ...extraFields]
        .filter(Boolean)
        .join(" ");
      return {
        name: spec.name,
        description: spec.description,
        category: spec.memoryMetadata.visualStyle || null,
        extraFields: extraFields.filter(Boolean),
        fullText,
      };
    }
  }
}

/** Internal completeness ratio (0–100) for future builder / production hints — not shown in UI yet. */
export function identityCompleteness(spec: IdentitySpec): number {
  const filled = (value: string | null | undefined) => Boolean(value?.trim());
  const ratio = (values: boolean[]) =>
    values.length === 0 ? 0 : Math.round((values.filter(Boolean).length / values.length) * 100);

  switch (spec.kind) {
    case "character":
      return ratio([
        filled(spec.name),
        filled(spec.description),
        filled(mergePersonality(spec)),
        filled(spec.memoryMetadata.appearanceMemory),
        filled(spec.visualKeywords),
        filled(spec.visualRules),
        spec.references.some((r) => r.role === "primary" && filled(r.url)),
        filled(spec.continuityMetadata.notes),
      ]);
    case "location":
      return ratio([
        filled(spec.name),
        filled(spec.description),
        filled(spec.type),
        filled(spec.memoryMetadata.visualIdentity),
        filled(spec.visualKeywords),
        spec.references.some((r) => r.role === "primary" && filled(r.url)),
      ]);
    case "prop":
      return ratio([
        filled(spec.name),
        filled(spec.description),
        filled(spec.memoryMetadata.appearanceMemory),
        spec.references.some((r) => r.role === "primary" && filled(r.url)),
      ]);
    case "world":
      return ratio([
        filled(spec.name),
        filled(spec.description),
        filled(spec.memoryMetadata.visualStyle),
        filled(spec.memoryMetadata.tone),
        filled(spec.memoryMetadata.continuityRules),
      ]);
  }
}

// ---------------------------------------------------------------------------
// Portable snapshots (Motion handoff prep — no handoff changes)
// ---------------------------------------------------------------------------

export function toPortableSnapshot(
  spec: CharacterIdentitySpec
): CharacterSnapshot;
export function toPortableSnapshot(spec: LocationIdentitySpec): LocationSnapshot;
export function toPortableSnapshot(spec: PropIdentitySpec): PropSnapshot;
export function toPortableSnapshot(
  spec: CharacterIdentitySpec | LocationIdentitySpec | PropIdentitySpec
): CharacterSnapshot | LocationSnapshot | PropSnapshot {
  const primary = spec.references.find((r) => r.role === "primary");
  const referenceImageUrl = primary?.url ?? "";

  switch (spec.kind) {
    case "character":
      return {
        id: spec.id,
        name: spec.name,
        role: spec.role,
        description: spec.description,
        personality: mergePersonality(spec),
        referenceImageUrl,
      };
    case "location":
      return {
        id: spec.id,
        name: spec.name,
        category: spec.type as LocationSnapshot["category"],
        description: spec.description,
        referenceImageUrl,
      };
    case "prop":
      return {
        id: spec.id,
        name: spec.name,
        category: spec.type as PropSnapshot["category"],
        description: spec.description,
        referenceImageUrl,
      };
  }
}

// ---------------------------------------------------------------------------
// Scene / shot planner compatibility (read-only extraction)
// ---------------------------------------------------------------------------

export type SceneIdentitySpecBundle = {
  characters: CharacterIdentitySpec[];
  location: LocationIdentitySpec | null;
  props: PropIdentitySpec[];
  worlds: WorldIdentitySpec[];
};

/** Collect identity specs linked on a scene for shot planner / future advice layers. */
export function collectSceneIdentitySpecs(params: {
  scene: StudioSceneDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
}): SceneIdentitySpecBundle {
  const characterById = new Map(params.characters.map((c) => [c.id, c]));
  const locationById = new Map(params.locations.map((l) => [l.id, l]));
  const propById = new Map(params.props.map((p) => [p.id, p]));
  const worldById = new Map(params.worlds.map((w) => [w.id, w]));

  const characters = params.scene.characters
    .map((sceneCharacter) => characterById.get(sceneCharacter.id) ?? sceneCharacter)
    .map((c) => toIdentitySpec(c));

  const locationEntity =
    params.scene.location ??
    (params.scene.locationId ? locationById.get(params.scene.locationId) : undefined);
  const location = locationEntity ? toIdentitySpec(locationEntity) : null;

  const props = params.scene.props
    .map((sceneProp) => propById.get(sceneProp.id) ?? sceneProp)
    .map((p) => toIdentitySpec(p));

  const worldIds = new Set<string>();
  for (const c of characters) {
    if (c.world.id) worldIds.add(c.world.id);
  }
  if (location?.world.id) worldIds.add(location.world.id);
  for (const p of props) {
    if (p.world.id) worldIds.add(p.world.id);
  }

  const worlds = [...worldIds]
    .map((id) => worldById.get(id))
    .filter((w): w is StudioWorldProfileListItem => Boolean(w))
    .map((w) => toIdentitySpec(w));

  return { characters, location, props, worlds };
}

export function identitySpecsByKind(
  specs: IdentitySpec[],
  kind: IdentitySpecKind
): IdentitySpec[] {
  return specs.filter((s) => s.kind === kind);
}

export function batchToSearchHaystacks(specs: IdentitySpec[]): IdentitySearchHaystack[] {
  return specs.map((spec) => toSearchHaystack(spec));
}
