/**
 * Studio V2 — shared Identity Spec model (facade over existing DB/memory fields).
 * No new persistence columns; maps to StudioCharacter, StudioLocation, StudioProp, StudioWorldProfile.
 */

import type { StudioContinuityStrength } from "@/lib/studio-continuity-strength";
import type { StudioIdentityStrength } from "@/lib/studio-memory-validation";
import type { StudioCharacterMemoryInput } from "@/lib/studio-character-validation";
import type { StudioLocationMemoryInput } from "@/lib/studio-location-memory-fields";
import type { StudioPropMemoryInput } from "@/lib/studio-prop-memory-fields";
import type { StudioWorldProfileUpdateInput } from "@/lib/studio-world-profile-validation";
import type {
  CharacterMemorySnapshot,
  LocationMemorySnapshot,
  PropMemorySnapshot,
  WorldMemorySnapshot,
} from "@/types/studio-memory-snapshots";

export type IdentitySpecKind = "character" | "location" | "prop" | "world";

export type IdentityReferenceRole =
  | "primary"
  | "mouth_closed"
  | "mouth_small"
  | "mouth_medium"
  | "mouth_wide"
  | "secondary";

export type IdentityReference = {
  url: string;
  storageKey?: string;
  role: IdentityReferenceRole;
  notes?: string;
};

export type IdentityWorldLink = {
  id: string | null;
  name: string | null;
};

export type IdentityContinuityMetadata = {
  notes: string;
  continuityStrength: StudioContinuityStrength;
  /** Character-only identity enforcement strength. */
  identityStrength?: StudioIdentityStrength;
};

/** Voice reference on character specs — read-only view of existing voice fields. */
export type IdentityVoiceReference = {
  enabled: boolean;
  provider: string;
  profile: string;
  language: string;
  gender: string;
  description: string;
  notes: string;
  lock: boolean;
};

export type CharacterIdentityMemoryMetadata = {
  appearanceMemory: string;
  personalityMemory: string;
  defaultClothing: string;
  defaultAccessories: string;
  primaryReferenceImageId: string | null;
  referenceNotes: string;
};

export type LocationIdentityMemoryMetadata = {
  worldMemory: string;
  visualIdentity: string;
  environmentKeywords: string;
};

export type PropIdentityMemoryMetadata = {
  appearanceMemory: string;
  brandingRules: string;
};

export type WorldIdentityMemoryMetadata = {
  visualStyle: string;
  tone: string;
  continuityRules: string;
};

export type IdentityMemoryMetadata =
  | CharacterIdentityMemoryMetadata
  | LocationIdentityMemoryMetadata
  | PropIdentityMemoryMetadata
  | WorldIdentityMemoryMetadata;

/** Shared identity fields across all asset kinds. */
export type IdentitySpecBase = {
  kind: IdentitySpecKind;
  id: string;
  name: string;
  /** Role (character) or category (location/prop); empty for world. */
  type: string;
  /** Character role alias — same value as `type` when kind is character. */
  role: string;
  description: string;
  personality: string;
  visualKeywords: string;
  /** Merged visual identity text for search and future builder UI. */
  visualRules: string;
  tags: string[];
  references: IdentityReference[];
  world: IdentityWorldLink;
  /** Mapped from continuityNotes (character/location/prop) or continuityRules (world). */
  usageContext: string;
  /** Branding don'ts — props via brandingRules; world via continuityRules. */
  forbiddenElements: string;
  continuityMetadata: IdentityContinuityMetadata;
  memoryMetadata: IdentityMemoryMetadata;
};

export type CharacterIdentitySpec = IdentitySpecBase & {
  kind: "character";
  role: string;
  memoryMetadata: CharacterIdentityMemoryMetadata;
  voice?: IdentityVoiceReference;
  isMascot: boolean;
};

export type LocationIdentitySpec = IdentitySpecBase & {
  kind: "location";
  memoryMetadata: LocationIdentityMemoryMetadata;
};

export type PropIdentitySpec = IdentitySpecBase & {
  kind: "prop";
  memoryMetadata: PropIdentityMemoryMetadata;
};

export type WorldIdentitySpec = IdentitySpecBase & {
  kind: "world";
  memoryMetadata: WorldIdentityMemoryMetadata;
};

export type IdentitySpec =
  | CharacterIdentitySpec
  | LocationIdentitySpec
  | PropIdentitySpec
  | WorldIdentitySpec;

export type IdentityMemorySnapshot =
  | CharacterMemorySnapshot
  | LocationMemorySnapshot
  | PropMemorySnapshot
  | WorldMemorySnapshot;

/** Normalized search/match payload for director, continuity, recurring detection. */
export type IdentitySearchHaystack = {
  name: string;
  description: string;
  category: string | null;
  extraFields: string[];
  fullText: string;
};

export type CharacterIdentitySpecPatch = StudioCharacterMemoryInput & {
  name?: string;
  role?: string;
  description?: string;
  personality?: string;
  referenceImageUrl?: string;
  referenceStorageKey?: string;
};

export type LocationIdentitySpecPatch = StudioLocationMemoryInput & {
  name?: string;
  category?: string;
  description?: string;
  referenceImageUrl?: string;
  referenceStorageKey?: string;
};

export type PropIdentitySpecPatch = StudioPropMemoryInput & {
  name?: string;
  category?: string;
  description?: string;
  referenceImageUrl?: string;
  referenceStorageKey?: string;
};

export type WorldIdentitySpecPatch = StudioWorldProfileUpdateInput;

export type IdentitySpecPatch =
  | { kind: "character"; patch: CharacterIdentitySpecPatch }
  | { kind: "location"; patch: LocationIdentitySpecPatch }
  | { kind: "prop"; patch: PropIdentitySpecPatch }
  | { kind: "world"; patch: WorldIdentitySpecPatch };
