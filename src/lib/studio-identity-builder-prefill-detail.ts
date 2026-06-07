/**
 * Build minimal entity detail stubs from Identity Builder prefill for create forms.
 */

import { loadIdentityBuilderPrefill } from "@/lib/studio-identity-builder-prefill-storage";
import type { IdentityBuilderPrefill } from "@/types/studio-asset-decision";
import type {
  StudioCharacterDetail,
  StudioLocationDetail,
  StudioPropDetail,
  StudioWorldProfileDetail,
} from "@/types/studio-api";

function slugFromName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function buildCharacterDetailFromPrefill(
  prefill: IdentityBuilderPrefill
): StudioCharacterDetail {
  return {
    id: "prefill",
    ownerId: "",
    name: prefill.name,
    slug: slugFromName(prefill.name),
    role: (prefill.role as StudioCharacterDetail["role"]) ?? "mascot",
    description: prefill.description ?? "",
    personality: prefill.personality ?? "",
    referenceImageUrl: "",
    isMascot: prefill.role === "mascot",
    appearanceMemory: "",
    personalityMemory: "",
    continuityNotes: prefill.usageContext ?? "",
    defaultClothing: "",
    defaultAccessories: "",
    visualKeywords: "",
    primaryReferenceImageId: null,
    referenceNotes: "",
    identityStrength: "strong",
    continuityStrength: "strong",
    worldProfileId: null,
    worldProfile: null,
    voiceEnabled: false,
    voiceProvider: "",
    voiceProfile: "warm_narrator",
    voiceLanguage: "en",
    voiceGender: "",
    voiceDescription: "",
    voiceNotes: "",
    voiceLock: false,
    voiceProfilesByLanguage: {},
    performanceEnabled: false,
    defaultSmileStrength: 50,
    defaultBlinkRate: "normal",
    defaultHeadMovement: "subtle",
    defaultMouthIntensity: "medium",
    idleAnimationStyle: "neutral",
    performanceNotes: "",
    mouthAnimationEnabled: false,
    mouthClosedAssetUrl: "",
    mouthSmallAssetUrl: "",
    mouthMediumAssetUrl: "",
    mouthWideAssetUrl: "",
    referenceStorageKey: "",
    isSystemCharacter: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export function buildLocationDetailFromPrefill(
  prefill: IdentityBuilderPrefill
): StudioLocationDetail {
  return {
    id: "prefill",
    ownerId: "",
    name: prefill.name,
    slug: slugFromName(prefill.name),
    category: "restaurant",
    description: prefill.description ?? "",
    referenceImageUrl: "",
    referenceStorageKey: "",
    worldMemory: "",
    visualIdentity: "",
    environmentKeywords: "",
    continuityNotes: prefill.usageContext ?? "",
    continuityStrength: "strong",
    worldProfileId: null,
    worldProfile: null,
    isSystemLocation: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export function buildPropDetailFromPrefill(prefill: IdentityBuilderPrefill): StudioPropDetail {
  return {
    id: "prefill",
    ownerId: "",
    name: prefill.name,
    slug: slugFromName(prefill.name),
    category: "other",
    description: prefill.description ?? "",
    referenceImageUrl: "",
    referenceStorageKey: "",
    appearanceMemory: "",
    brandingRules: "",
    continuityNotes: prefill.usageContext ?? "",
    continuityStrength: "strong",
    worldProfileId: null,
    worldProfile: null,
    isSystemProp: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export function buildWorldDetailFromPrefill(
  prefill: IdentityBuilderPrefill
): StudioWorldProfileDetail {
  return {
    id: "prefill",
    ownerId: "",
    name: prefill.name,
    slug: slugFromName(prefill.name),
    description: prefill.description ?? "",
    visualStyle: "",
    tone: "",
    continuityRules: prefill.usageContext ?? "",
    continuityStrength: "strong",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export function readIdentityPrefillForKind(
  kind: IdentityBuilderPrefill["kind"]
): IdentityBuilderPrefill | null {
  const prefill = loadIdentityBuilderPrefill();
  if (!prefill || prefill.kind !== kind) {
    return null;
  }
  return prefill;
}
