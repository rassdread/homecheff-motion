import type { StudioContinuityStrength } from "@/lib/studio-continuity-strength";

export type CharacterMemorySnapshot = {
  id: string;
  name: string;
  role: string;
  appearanceMemory: string;
  personalityMemory: string;
  continuityNotes: string;
  defaultClothing: string;
  defaultAccessories: string;
  visualKeywords: string;
  referenceImageUrl: string;
  primaryReferenceImageId: string | null;
  referenceNotes: string;
  identityStrength: StudioContinuityStrength;
  continuityStrength: StudioContinuityStrength;
  worldProfileId: string | null;
  worldProfileName: string | null;
};

export type LocationMemorySnapshot = {
  id: string;
  name: string;
  category: string;
  worldMemory: string;
  visualIdentity: string;
  environmentKeywords: string;
  continuityNotes: string;
  referenceImageUrl: string;
  continuityStrength: StudioContinuityStrength;
  worldProfileId: string | null;
  worldProfileName: string | null;
};

export type PropMemorySnapshot = {
  id: string;
  name: string;
  category: string;
  appearanceMemory: string;
  brandingRules: string;
  continuityNotes: string;
  referenceImageUrl: string;
  continuityStrength: StudioContinuityStrength;
  worldProfileId: string | null;
  worldProfileName: string | null;
};

export type WorldMemorySnapshot = {
  id: string;
  name: string;
  description: string;
  visualStyle: string;
  tone: string;
  continuityRules: string;
  continuityStrength: StudioContinuityStrength;
};

export type SceneMemoryBundle = {
  characters: CharacterMemorySnapshot[];
  location: LocationMemorySnapshot | null;
  props: PropMemorySnapshot[];
  world: WorldMemorySnapshot | null;
  continuityStrength: StudioContinuityStrength;
};
