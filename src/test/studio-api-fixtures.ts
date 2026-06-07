/**
 * Shared test fixtures for Studio API types — keeps test files aligned with schema.
 */
import type { StudioCharacterRole } from "@/lib/studio-character-roles";
import type { StudioSceneEnergy } from "@/lib/studio-scene-director";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

const NOW = "2026-01-01T00:00:00.000Z";

export function studioCharacterListItem(
  partial: Partial<StudioCharacterListItem> & { id: string; name: string }
): StudioCharacterListItem {
  const slug = partial.slug ?? partial.name.toLowerCase().replace(/\s+/g, "-");
  return {
    id: partial.id,
    ownerId: partial.ownerId ?? "u1",
    name: partial.name,
    slug,
    role: (partial.role ?? "human") as StudioCharacterRole,
    description: partial.description ?? "",
    personality: partial.personality ?? "",
    referenceImageUrl: partial.referenceImageUrl ?? "",
    isMascot: partial.isMascot ?? false,
    appearanceMemory: partial.appearanceMemory ?? "",
    personalityMemory: partial.personalityMemory ?? "",
    continuityNotes: partial.continuityNotes ?? "",
    defaultClothing: partial.defaultClothing ?? "",
    defaultAccessories: partial.defaultAccessories ?? "",
    visualKeywords: partial.visualKeywords ?? "",
    primaryReferenceImageId: partial.primaryReferenceImageId ?? null,
    referenceNotes: partial.referenceNotes ?? "",
    identityStrength: partial.identityStrength ?? "strong",
    continuityStrength: partial.continuityStrength ?? "strong",
    worldProfileId: partial.worldProfileId ?? null,
    worldProfile: partial.worldProfile ?? null,
    voiceEnabled: partial.voiceEnabled ?? false,
    voiceProvider: partial.voiceProvider ?? "",
    voiceProfile: partial.voiceProfile ?? "warm_narrator",
    voiceLanguage: partial.voiceLanguage ?? "en",
    voiceGender: partial.voiceGender ?? "",
    voiceDescription: partial.voiceDescription ?? "",
    voiceNotes: partial.voiceNotes ?? "",
    voiceLock: partial.voiceLock ?? false,
    voiceProfilesByLanguage: partial.voiceProfilesByLanguage ?? {},
    performanceEnabled: partial.performanceEnabled ?? false,
    defaultSmileStrength: partial.defaultSmileStrength ?? 50,
    defaultBlinkRate: partial.defaultBlinkRate ?? "normal",
    defaultHeadMovement: partial.defaultHeadMovement ?? "subtle",
    defaultMouthIntensity: partial.defaultMouthIntensity ?? "medium",
    idleAnimationStyle: partial.idleAnimationStyle ?? "neutral",
    performanceNotes: partial.performanceNotes ?? "",
    mouthAnimationEnabled: partial.mouthAnimationEnabled ?? false,
    mouthClosedAssetUrl: partial.mouthClosedAssetUrl ?? "",
    mouthSmallAssetUrl: partial.mouthSmallAssetUrl ?? "",
    mouthMediumAssetUrl: partial.mouthMediumAssetUrl ?? "",
    mouthWideAssetUrl: partial.mouthWideAssetUrl ?? "",
    createdAt: partial.createdAt ?? NOW,
    updatedAt: partial.updatedAt ?? NOW,
  };
}

export function studioSceneDetail(
  partial: Partial<StudioSceneDetail> & { order: number }
): StudioSceneDetail {
  return {
    id: partial.id ?? `scene-${partial.order}`,
    storyboardId: partial.storyboardId ?? "sb-1",
    order: partial.order,
    title: partial.title ?? `Scene ${partial.order + 1}`,
    description: partial.description ?? "",
    action: partial.action ?? "",
    emotion: partial.emotion ?? "",
    camera: partial.camera ?? "",
    shotType: partial.shotType ?? "medium_wide",
    cameraMovement: partial.cameraMovement ?? "static",
    sceneEnergy: (partial.sceneEnergy ?? "neutral") as StudioSceneEnergy,
    transitionToNext: partial.transitionToNext ?? "",
    musicCueType: partial.musicCueType ?? "",
    musicEnergyTarget: partial.musicEnergyTarget ?? "",
    musicTransitionType: partial.musicTransitionType ?? "",
    musicStartBehavior: partial.musicStartBehavior ?? "",
    musicEndBehavior: partial.musicEndBehavior ?? "",
    soundEnvironmentOverride: partial.soundEnvironmentOverride ?? "",
    soundCharacterOverride: partial.soundCharacterOverride ?? "",
    soundPropOverride: partial.soundPropOverride ?? "",
    soundTransitionOverride: partial.soundTransitionOverride ?? "",
    soundAmbientOverride: partial.soundAmbientOverride ?? "",
    voicePriority: partial.voicePriority ?? "",
    musicPriority: partial.musicPriority ?? "",
    soundPriority: partial.soundPriority ?? "",
    audioFocus: partial.audioFocus ?? "",
    duckingMode: partial.duckingMode ?? "",
    voiceAssetOverride: partial.voiceAssetOverride ?? "",
    musicAssetOverride: partial.musicAssetOverride ?? "",
    ambienceAssetOverride: partial.ambienceAssetOverride ?? "",
    sfxAssetOverride: partial.sfxAssetOverride ?? "",
    durationSeconds: partial.durationSeconds ?? 5,
    locationId: partial.locationId ?? partial.location?.id ?? null,
    location: partial.location ?? null,
    characters: partial.characters ?? [],
    props: partial.props ?? [],
    selectedSceneImageId: partial.selectedSceneImageId ?? null,
    sceneImages: partial.sceneImages ?? [],
    createdAt: partial.createdAt ?? NOW,
    updatedAt: partial.updatedAt ?? NOW,
  };
}

export function studioPropListItem(
  partial: Partial<StudioPropListItem> & { id: string; name: string }
): StudioPropListItem {
  return {
    id: partial.id,
    ownerId: partial.ownerId ?? "u1",
    name: partial.name,
    slug: partial.slug ?? partial.name.toLowerCase(),
    category: partial.category ?? "other",
    description: partial.description ?? "",
    referenceImageUrl: partial.referenceImageUrl ?? "",
    appearanceMemory: partial.appearanceMemory ?? "",
    brandingRules: partial.brandingRules ?? "",
    continuityNotes: partial.continuityNotes ?? "",
    continuityStrength: partial.continuityStrength ?? "strong",
    worldProfileId: partial.worldProfileId ?? null,
    worldProfile: partial.worldProfile ?? null,
    createdAt: partial.createdAt ?? NOW,
    updatedAt: partial.updatedAt ?? NOW,
  };
}

export function studioLocationListItem(
  partial: Partial<StudioLocationListItem> & { id: string; name: string }
): StudioLocationListItem {
  return {
    id: partial.id,
    ownerId: partial.ownerId ?? "u1",
    name: partial.name,
    slug: partial.slug ?? partial.name.toLowerCase(),
    category: partial.category ?? "office",
    description: partial.description ?? "",
    referenceImageUrl: partial.referenceImageUrl ?? "",
    worldMemory: partial.worldMemory ?? "",
    visualIdentity: partial.visualIdentity ?? "",
    environmentKeywords: partial.environmentKeywords ?? "",
    continuityNotes: partial.continuityNotes ?? "",
    continuityStrength: partial.continuityStrength ?? "strong",
    worldProfileId: partial.worldProfileId ?? null,
    worldProfile: partial.worldProfile ?? null,
    createdAt: partial.createdAt ?? NOW,
    updatedAt: partial.updatedAt ?? NOW,
  };
}

export function studioWorldProfileListItem(
  partial: Partial<StudioWorldProfileListItem> & { id: string; name: string }
): StudioWorldProfileListItem {
  return {
    id: partial.id,
    ownerId: partial.ownerId ?? "u1",
    name: partial.name,
    slug: partial.slug ?? partial.name.toLowerCase().replace(/\s+/g, "-"),
    description: partial.description ?? "",
    visualStyle: partial.visualStyle ?? "",
    tone: partial.tone ?? "",
    continuityRules: partial.continuityRules ?? "",
    continuityStrength: partial.continuityStrength ?? "strong",
    createdAt: partial.createdAt ?? NOW,
    updatedAt: partial.updatedAt ?? NOW,
  };
}

export function studioStoryboardDetail(
  partial: Partial<StudioStoryboardDetail> & { scenes?: StudioSceneDetail[] }
): StudioStoryboardDetail {
  const scenes = partial.scenes ?? [];
  return {
    id: partial.id ?? "sb-1",
    ownerId: partial.ownerId ?? "u1",
    title: partial.title ?? "Test storyboard",
    description: partial.description ?? "",
    promptStyleProfile: partial.promptStyleProfile ?? "commercial",
    directorProfile: partial.directorProfile ?? "commercial",
    aiDirectorPrompt: partial.aiDirectorPrompt ?? "",
    aiDirectorStyleStrength: partial.aiDirectorStyleStrength ?? "balanced",
    voiceEnabled: partial.voiceEnabled ?? false,
    voiceLanguage: partial.voiceLanguage ?? "en",
    voiceStyle: partial.voiceStyle ?? "",
    voiceProfile: partial.voiceProfile ?? "warm_narrator",
    narrationMode: partial.narrationMode ?? "narrator",
    voiceNarrationScript: partial.voiceNarrationScript ?? "",
    musicEnabled: partial.musicEnabled ?? false,
    musicStyle: partial.musicStyle ?? "",
    musicIntensity: partial.musicIntensity ?? "",
    musicNarrativeRole: partial.musicNarrativeRole ?? "",
    musicNotes: partial.musicNotes ?? "",
    soundEnabled: partial.soundEnabled ?? false,
    soundStyle: partial.soundStyle ?? "",
    soundDensity: partial.soundDensity ?? "",
    soundNotes: partial.soundNotes ?? "",
    audioProductionEnabled: partial.audioProductionEnabled ?? false,
    audioStyle: partial.audioStyle ?? "",
    audioPriorityStrategy: partial.audioPriorityStrategy ?? "",
    audioNotes: partial.audioNotes ?? "",
    audioAssetsEnabled: partial.audioAssetsEnabled ?? false,
    audioAssetNotes: partial.audioAssetNotes ?? "",
    audioAssetLinks: partial.audioAssetLinks ?? { version: 1 },
    autoSelectImprovedImage: partial.autoSelectImprovedImage ?? true,
    sceneCount: partial.sceneCount ?? scenes.length,
    createdAt: partial.createdAt ?? NOW,
    updatedAt: partial.updatedAt ?? NOW,
    scenes,
  };
}

export function studioSceneImageListItem(
  partial: Partial<StudioSceneImageListItem> & { id: string; sceneId: string }
): StudioSceneImageListItem {
  return {
    id: partial.id,
    sceneId: partial.sceneId,
    status: partial.status ?? "completed",
    promptVersion: partial.promptVersion ?? 1,
    generationVersion: partial.generationVersion ?? 1,
    generatedPrompt: partial.generatedPrompt ?? "",
    imageUrl: partial.imageUrl ?? "",
    storageKey: partial.storageKey ?? "",
    thumbnailUrl: partial.thumbnailUrl ?? "",
    provider: partial.provider ?? "mock",
    seed: partial.seed ?? null,
    generationSettings: partial.generationSettings ?? null,
    consistencyScore: partial.consistencyScore ?? null,
    consistencyStatus: partial.consistencyStatus ?? "good",
    consistencyReport: partial.consistencyReport ?? null,
    consistencyRecommendations: partial.consistencyRecommendations ?? [],
    consistencyAnalyzedAt: partial.consistencyAnalyzedAt ?? null,
    correctionRecommendations: partial.correctionRecommendations ?? [],
    promptPatches: partial.promptPatches ?? [],
    correctedPrompt: partial.correctedPrompt ?? "",
    regeneratedFromImageId: partial.regeneratedFromImageId ?? null,
    previousConsistencyScore: partial.previousConsistencyScore ?? null,
    improvementScore: partial.improvementScore ?? null,
    previousVisionScore: partial.previousVisionScore ?? null,
    visionImprovementScore: partial.visionImprovementScore ?? null,
    overallImprovementScore: partial.overallImprovementScore ?? null,
    visionScore: partial.visionScore ?? null,
    visionStatus: partial.visionStatus ?? "good",
    visionReport: partial.visionReport ?? null,
    visionAnalyzedAt: partial.visionAnalyzedAt ?? null,
    createdAt: partial.createdAt ?? NOW,
    updatedAt: partial.updatedAt ?? NOW,
  };
}

/** Cast partial test rows when only a subset of fields matter for the unit under test. */
export function fixture<T>(value: object): T {
  return value as T;
}
