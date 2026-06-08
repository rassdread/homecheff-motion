import {
  emptyCharacterIdentityForm,
  mergeCharacterIdentityForm,
  type CharacterIdentityFormValues,
} from "@/lib/studio-character-identity-fields";
import {
  mergePropIdentityForm,
  type PropIdentityFormValues,
} from "@/lib/studio-prop-identity-fields";
import {
  mergeLocationIdentityForm,
  type LocationIdentityFormValues,
} from "@/lib/studio-location-identity-fields";
import {
  mergeWorldIdentityForm,
  type WorldIdentityFormValues,
} from "@/lib/studio-world-identity-fields";
import type { StudioPropCategory } from "@/lib/studio-prop-categories";
import type { StudioContinuityStrength } from "@/lib/studio-continuity-strength";
import { applyWizardChoicesToFields } from "@/lib/studio-asset-wizard-choices";
import type {
  AssetCreateEntryPath,
  AssetPromptPrefillProposal,
  AssetReferenceMode,
  StudioAssetKind,
} from "@/types/studio-asset-creation";
import type { StudioCharacterFormValues } from "@/components/studio/studio-character-form";
import type { StudioPropFormValues } from "@/components/studio/studio-prop-form";
import type { StudioLocationFormValues } from "@/components/studio/studio-location-form";
import type { StudioWorldProfileFormValues } from "@/components/studio/studio-world-profile-form";

export type AssetWizardDraft = {
  kind: StudioAssetKind;
  entryPath: AssetCreateEntryPath;
  promptText: string;
  promptUsage: string;
  promptBrandRules: string;
  proposal: AssetPromptPrefillProposal | null;
  proposalApplied: boolean;
  imageProposal: AssetPromptPrefillProposal | null;
  name: string;
  description: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
  referenceMode: AssetReferenceMode;
  referenceGenerationStatus: "idle" | "generating" | "preview" | "accepted" | "failed";
  referenceGenerationError: string;
  referenceGenerationId: string;
  generatedReferencePreviewUrl: string;
  generatedReferenceStorageKey: string;
  referenceGenerationPrompt: string;
  /** Chip selections keyed by choice step id. */
  choices: Record<string, string>;
  /** Free-text when a choice step uses the custom option. */
  customTexts: Record<string, string>;
  /** Live summary built from choices (image gen + review + memory). */
  summaryPrompt: string;
  choiceBasedFlow: boolean;
  /** Essentials-step fields (kind-specific). */
  fields: Record<string, string | null>;
};

export function emptyAssetWizardDraft(
  kind: StudioAssetKind,
  entryPath: AssetCreateEntryPath
): AssetWizardDraft {
  return {
    kind,
    entryPath,
    promptText: "",
    promptUsage: "",
    promptBrandRules: "",
    proposal: null,
    proposalApplied: false,
    imageProposal: null,
    name: "",
    description: "",
    referenceImageUrl: "",
    referenceStorageKey: "",
    referenceMode: null,
    referenceGenerationStatus: "idle",
    referenceGenerationError: "",
    referenceGenerationId: "",
    generatedReferencePreviewUrl: "",
    generatedReferenceStorageKey: "",
    referenceGenerationPrompt: "",
    choices: {},
    customTexts: {},
    summaryPrompt: "",
    choiceBasedFlow: false,
    fields: {},
  };
}

export function emptyChoiceBasedWizardDraft(kind: StudioAssetKind): AssetWizardDraft {
  return {
    ...emptyAssetWizardDraft(kind, "design"),
    choiceBasedFlow: true,
  };
}

export function syncChoiceDraft(
  draft: AssetWizardDraft,
  patch: {
    choices?: Record<string, string>;
    customTexts?: Record<string, string>;
    summaryPrompt?: string;
    name?: string;
    description?: string;
  }
): AssetWizardDraft {
  const choices = patch.choices ?? draft.choices;
  const customTexts = patch.customTexts ?? draft.customTexts;
  const fields = applyWizardChoicesToFields(draft.kind, choices, customTexts);
  return {
    ...draft,
    choices,
    customTexts,
    fields,
    summaryPrompt: patch.summaryPrompt ?? draft.summaryPrompt,
    name: patch.name ?? draft.name,
    description: patch.description ?? draft.description,
  };
}

export function applyProposalToDraft(
  draft: AssetWizardDraft,
  proposal: AssetPromptPrefillProposal
): AssetWizardDraft {
  const prefill = proposal.prefill;
  return {
    ...draft,
    proposal,
    proposalApplied: true,
    name: String(prefill.name ?? draft.name).trim() || draft.name,
    description: String(prefill.description ?? draft.description).trim() || draft.description,
    fields: { ...draft.fields, ...stringifyPrefillFields(prefill) },
  };
}

function stringifyPrefillFields(prefill: Record<string, unknown>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(prefill)) {
    if (value == null) {
      continue;
    }
    if (typeof value === "string") {
      out[key] = value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      out[key] = String(value);
    }
  }
  return out;
}

function emptyCharacterVoice() {
  return {
    voiceEnabled: false,
    voiceProvider: "elevenlabs",
    voiceProfile: "warm_narrator",
    voiceLanguage: "en",
    voiceGender: "",
    voiceDescription: "",
    voiceNotes: "",
    voiceLock: false,
    voiceProfilesByLanguage: {},
  };
}

function emptyPerformance() {
  return {
    performanceEnabled: false,
    defaultSmileStrength: 70,
    defaultBlinkRate: "medium" as const,
    defaultHeadMovement: "medium" as const,
    defaultMouthIntensity: "medium" as const,
    idleAnimationStyle: "subtle" as const,
    performanceNotes: "",
    mouthAnimationEnabled: false,
    mouthClosedAssetUrl: "",
    mouthSmallAssetUrl: "",
    mouthMediumAssetUrl: "",
    mouthWideAssetUrl: "",
  };
}

export function characterFormValuesFromWizardDraft(draft: AssetWizardDraft): StudioCharacterFormValues {
  let identity: CharacterIdentityFormValues = emptyCharacterIdentityForm();
  if (draft.proposalApplied && draft.proposal) {
    identity = mergeCharacterIdentityForm(
      identity,
      draft.proposal.prefill as Partial<CharacterIdentityFormValues>
    );
  }
  identity = mergeCharacterIdentityForm(identity, {
    name: draft.name || identity.name,
    description: draft.description || identity.description,
    characterType: draft.fields.characterType ?? identity.characterType,
    role: (draft.fields.role as CharacterIdentityFormValues["role"]) ?? identity.role,
    visualStyle: draft.fields.visualStyle ?? identity.visualStyle,
    personality: draft.fields.personality ?? identity.personality,
    clothing: draft.fields.clothing ?? identity.clothing,
    shapeLanguage: draft.fields.shapeLanguage ?? identity.shapeLanguage,
    worldProfileId: draft.fields.worldProfileId ?? identity.worldProfileId,
  });

  const voice = emptyCharacterVoice();
  if (draft.fields.voiceProfile) {
    voice.voiceEnabled = true;
    voice.voiceProfile = draft.fields.voiceProfile;
  }
  if (draft.fields.voiceLanguage) {
    voice.voiceLanguage = draft.fields.voiceLanguage;
  }

  return {
    identity,
    referenceImageUrl: draft.referenceImageUrl,
    referenceStorageKey: draft.referenceStorageKey,
    voice,
    performance: emptyPerformance(),
  };
}

export function propFormValuesFromWizardDraft(draft: AssetWizardDraft): StudioPropFormValues {
  let identity: PropIdentityFormValues = {
    name: draft.name,
    description: draft.description,
    propType: draft.fields.propType ?? "",
    propFunction: "",
    shapeLanguage: "",
    material: draft.fields.material ?? "",
    colorTheme: draft.fields.colorTheme ?? "",
    sizeImpression: "",
    styleId: draft.fields.styleId ?? "",
    appearanceMemory: "",
    forbiddenElements: "",
    usageContext: draft.fields.usageContext ?? "",
    linkedCharacterIds: [],
    worldProfileId: draft.fields.worldProfileId ?? null,
  };
  if (draft.proposalApplied && draft.proposal) {
    identity = mergePropIdentityForm(
      identity,
      draft.proposal.prefill as Partial<PropIdentityFormValues>
    );
  }
  identity.name = draft.name || identity.name;
  identity.description = draft.description || identity.description;

  return {
    name: draft.name,
    category: (draft.fields.category as StudioPropCategory) ?? "brand_asset",
    description: draft.description,
    referenceImageUrl: draft.referenceImageUrl,
    referenceStorageKey: draft.referenceStorageKey,
    identity,
  };
}

export function locationFormValuesFromWizardDraft(draft: AssetWizardDraft): StudioLocationFormValues {
  let identity: LocationIdentityFormValues = {
    name: draft.name,
    description: draft.description,
    locationType: draft.fields.locationType ?? "",
    visualStyle: draft.fields.visualStyle ?? "",
    mood: draft.fields.mood ?? "",
    architecture: draft.fields.architecture ?? "",
    materials: "",
    colorTheme: draft.fields.colorTheme ?? "",
    lighting: draft.fields.lighting ?? "",
    crowdLevel: "",
    visualIdentity: "",
    worldMemory: "",
    forbiddenElements: "",
    usageContext: "",
    worldProfileId: draft.fields.worldProfileId ?? null,
  };
  if (draft.proposalApplied && draft.proposal) {
    identity = mergeLocationIdentityForm(
      identity,
      draft.proposal.prefill as Partial<LocationIdentityFormValues>
    );
  }
  identity.name = draft.name || identity.name;
  identity.description = draft.description || identity.description;

  return {
    name: draft.name,
    category: "garden",
    description: draft.description,
    referenceImageUrl: draft.referenceImageUrl,
    referenceStorageKey: draft.referenceStorageKey,
    identity,
  };
}

export function worldFormValuesFromWizardDraft(draft: AssetWizardDraft): StudioWorldProfileFormValues {
  let identity: WorldIdentityFormValues = {
    name: draft.name,
    description: draft.description,
    worldType: draft.fields.worldType ?? "",
    visualStyle: draft.fields.visualStyle ?? "",
    shapeLanguage: "",
    colorTheme: draft.fields.colorTheme ?? "",
    colorRules: draft.fields.brandRules ?? "",
    lighting: draft.fields.lighting ?? "",
    mood: draft.fields.mood ?? "",
    environmentFeel: "",
    visualDetails: "",
    musicStyle: "",
    ambience: "",
    audioEnergy: "",
    voiceDirection: "",
    soundFeel: "",
    audioDetails: "",
    cameraStyle: "",
    motionStyle: "",
    pacing: "",
    preferredShots: "",
    forbiddenShotStyles: "",
    renderStrategies: [],
    usageContext: "",
    forbiddenElements: "",
    audioForbiddenElements: "",
    brandRules: draft.fields.brandRules ?? "",
  };
  if (draft.proposalApplied && draft.proposal) {
    identity = mergeWorldIdentityForm(
      identity,
      draft.proposal.prefill as Partial<WorldIdentityFormValues>
    );
  }
  identity.name = draft.name || identity.name;
  identity.description = draft.description || identity.description;

  return {
    continuityStrength: (draft.fields.continuityStrength as StudioContinuityStrength) ?? "medium",
    identity,
  };
}
