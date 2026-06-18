/** Identity preservation for character/mascot variations. */

export type IdentityKind =
  | "human"
  | "animal"
  | "mascot"
  | "character"
  | "homecheff_mascot"
  | "brand_mascot"
  | "generic";

export type IdentityPreservationProfile = {
  kind: IdentityKind;
  assetName?: string;
  preserveFace: boolean;
  preserveEyes: boolean;
  preserveMouth: boolean;
  preserveCoreShape: boolean;
  preservePersonality: boolean;
  preserveBrandIdentity: boolean;
  preserveBodyShape: boolean;
  preserveGlobe: boolean;
  preserveFurPattern: boolean;
  preserveBreedCharacteristics: boolean;
  editableTraits: string[];
  lockedTraits: string[];
};

export type IdentityPreservationOverrides = {
  preserveFace: boolean;
  preserveEyes: boolean;
  preserveMouth: boolean;
  preservePersonality: boolean;
  preserveBodyShape: boolean;
  preserveCoreShape: boolean;
  preserveBrandIdentity: boolean;
};

export type IdentityDriftAssessment = {
  driftScore: number;
  identityRetentionPercent: number;
  exceedsThreshold: boolean;
  warningNl?: string;
  warningEn?: string;
  changedTraits: string[];
  preservedTraits: string[];
};
