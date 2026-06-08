/** Supporting reference roles (primary lives on character.referenceImageUrl). */
export type CharacterSupportingReferenceRole = "face" | "outfit" | "style" | "expression";

export type CharacterReferenceStatus = "active" | "archived";

export type CharacterSupportingReference = {
  id: string;
  role: CharacterSupportingReferenceRole;
  imageUrl: string;
  storageKey: string;
  label: string;
  uploadedAt: string;
  status: CharacterReferenceStatus;
};

export type CharacterArchivedReference = {
  id: string;
  imageUrl: string;
  storageKey: string;
  label: string;
  archivedAt: string;
  wasPrimary: boolean;
};

export type CharacterReferencesBundle = {
  version: 1;
  /** ISO timestamp when the current primary reference was last set. */
  primarySetAt: string | null;
  supporting: CharacterSupportingReference[];
  archive: CharacterArchivedReference[];
};

export type CanonicalPrimaryReference = {
  id: string;
  imageUrl: string;
  storageKey: string;
  isOfficial: true;
};

export type CanonicalCharacterReferencesView = {
  primary: CanonicalPrimaryReference | null;
  supporting: CharacterSupportingReference[];
  archive: CharacterArchivedReference[];
  humanNotes: string;
};

export type CanonicalCharacterIdentity = {
  primaryReference: CanonicalPrimaryReference | null;
  supportingReferences: CharacterSupportingReference[];
  visualStyle: string;
  outfit: string;
  colorTheme: string;
  worldProfileId: string | null;
  worldProfileName: string | null;
  identityMetadata: {
    name: string;
    role: string;
    description: string;
    personality: string;
    appearanceMemory: string;
    visualKeywords: string;
  };
};

export type CharacterStoryUsage = {
  sceneCount: number;
  storyboardCount: number;
  storyboardIds: string[];
};

export type CharacterHealthWarningId =
  | "no_voice"
  | "no_world"
  | "no_reference"
  | "stale_reference";

export type CharacterHealthWarning = {
  id: CharacterHealthWarningId;
  labelKey: string;
};

export type CharacterConsistencyStatus = "ready" | "needs_attention";

export type CharacterHealthView = {
  status: CharacterConsistencyStatus;
  score: number;
  warnings: CharacterHealthWarning[];
  checks: {
    identityFilled: boolean;
    voiceLinked: boolean;
    worldLinked: boolean;
    primaryReferencePresent: boolean;
  };
  references: CanonicalCharacterReferencesView;
  storyUsage: CharacterStoryUsage | null;
};
