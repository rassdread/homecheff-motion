import { syncLegacyFieldFromBeats } from "@/lib/story-text-beats";
import { emptySceneTextDraft } from "@/lib/instant-scene-text-draft-model";
import { CREATOR_WIZARD_FLOW_VERSION } from "@/lib/creator-wizard-steps";
import type { AnimationSceneEmotionId } from "@/lib/animation-scene-emotions";
import {
  createWizardDraftId,
  type PersistedSceneTextDraft,
  type PersistedWizardImage,
  type PersistedWizardSceneSlot,
  type PersistedWizardState,
} from "@/lib/instant-premium-wizard-storage";
import {
  EMPTY_WIZARD_IMAGE_BLOB,
  type InstantWizardLocalImage,
} from "@/lib/instant-wizard-image-model";
import { INSTANT_WIZARD_DEFAULT_BAKED_TEXT } from "@/lib/reset-instant-premium-wizard";
import type { InstantMode, InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";
import {
  resolveMotionHandoffExecutionPrefill,
  toMotionHandoffExecutionPrefillSummary,
} from "@/lib/motion-handoff-execution-prefill";
import {
  resolveMotionHandoffExecutionConsumption,
  toMotionExecutionConsumptionSummary,
} from "@/lib/motion-handoff-execution-consumption";
import type { MotionHandoffExecutionPrefill } from "@/types/motion-handoff-execution-prefill";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";
import { normalizeStorySceneDurationSeconds } from "@/lib/story-overlay-templates";
import {
  buildMotionSceneStudioQa,
  buildMotionStudioIntelligenceSnapshot,
} from "@/lib/build-motion-studio-intelligence";
import { buildStudioSceneMotionInstructions } from "@/lib/build-studio-scene-motion-instructions";
import { sanitizeMotionHandoffForStorage } from "@/lib/studio-motion-handoff-storage";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { StudioSceneContextMetadata } from "@/types/studio-scene-context";
import type { StudioSceneImageReference } from "@/types/studio-scene-image-reference";
import type { WizardImageSource } from "@/types/studio-scene-image-reference";

const STUDIO_EMOTION_TO_MOTION: Record<string, AnimationSceneEmotionId> = {
  happy: "cheerful",
  excited: "enthusiastic",
  proud: "proud",
  focused: "motivated",
  curious: "surprised",
  serious: "motivated",
  celebrating: "celebration",
};

export function mapStudioEmotionToMotion(
  studioEmotion: string
): { emotionMode: "manual"; emotion: AnimationSceneEmotionId } | { emotionMode: "auto" } {
  const key = studioEmotion.trim().toLowerCase();
  const mapped = STUDIO_EMOTION_TO_MOTION[key];
  if (mapped) {
    return { emotionMode: "manual", emotion: mapped };
  }
  return { emotionMode: "auto" };
}

function legacyMapHandoffSceneToPersistedText(
  scene: MotionHandoffPayload["scenes"][number],
  fallbackTransition: InstantTransitionSeconds,
  durationOverride?: number
): PersistedSceneTextDraft {
  const base = emptySceneTextDraft(fallbackTransition);
  const duration = normalizeStorySceneDurationSeconds(
    durationOverride ?? scene.durationSeconds,
    fallbackTransition
  );
  const emotionPatch = mapStudioEmotionToMotion(scene.emotion);

  return {
    ...base,
    template: "scene",
    transitionDurationSeconds: duration,
    durationSeconds: duration,
    title: scene.title.trim() || base.title,
    subtitle: scene.description.trim(),
    heroText: scene.action.trim() ? `Action: ${scene.action.trim()}` : "",
    extraLines: scene.notes?.trim() ? [scene.notes.trim()] : [],
    ...emotionPatch,
  };
}

export function mapHandoffSceneToPersistedText(
  scene: MotionHandoffPayload["scenes"][number],
  fallbackTransition: InstantTransitionSeconds = 5,
  durationOverride?: number
): PersistedSceneTextDraft {
  const beats = scene.studioTextBeats;
  if (!beats) {
    return legacyMapHandoffSceneToPersistedText(scene, fallbackTransition, durationOverride);
  }

  const base = emptySceneTextDraft(fallbackTransition);
  const duration = normalizeStorySceneDurationSeconds(
    durationOverride ?? scene.durationSeconds,
    fallbackTransition
  );
  const emotionPatch = mapStudioEmotionToMotion(scene.emotion);

  const title = syncLegacyFieldFromBeats(beats.titleBeats) || scene.title.trim();
  const subtitle =
    syncLegacyFieldFromBeats(beats.subtitleBeats) || scene.description.trim();
  const heroText =
    beats.heroText.trim() ||
    syncLegacyFieldFromBeats(beats.heroTextBeats) ||
    (scene.action.trim() ? scene.action.trim() : "");

  const extraLines =
    beats.beatLines.length > 0
      ? beats.beatLines
      : scene.notes?.trim()
        ? [scene.notes.trim()]
        : [];

  return {
    ...base,
    template: beats.template,
    transitionDurationSeconds: duration,
    durationSeconds: duration,
    title,
    subtitle,
    heroText,
    headlineBeats: beats.headlineBeats,
    titleBeats: beats.titleBeats,
    subtitleBeats: beats.subtitleBeats,
    heroTextBeats: beats.heroTextBeats,
    finaleTextBeats: beats.finaleTextBeats,
    heroFinaleText: beats.heroFinaleText,
    heroFinale: beats.finaleTextBeats.length > 0 || Boolean(beats.heroFinaleText.trim()),
    extraLines,
    ...emotionPatch,
  };
}

export function mapHandoffSceneToPersistedImage(
  scene: MotionHandoffPayload["scenes"][number]
): PersistedWizardImage | null {
  const url = scene.selectedSceneImageUrl?.trim();
  if (!url || !isValidHttpUrl(url)) {
    return null;
  }

  const ref = scene.sceneImageReference;
  const imageId = scene.selectedSceneImageId ?? `studio-${scene.sceneId}`;
  const thumb =
    ref?.thumbnailUrl?.trim() && isValidHttpUrl(ref.thumbnailUrl) ? ref.thumbnailUrl : url;

  return {
    id: imageId,
    originalFileName: `${scene.title.trim() || scene.sceneId}.studio.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: 1,
    remoteWorkingUrl: url,
    remoteThumbnailUrl: thumb,
    imageSource: "studio",
    studioSceneImageId: scene.selectedSceneImageId ?? undefined,
    studioImageReference: ref ?? undefined,
    bakedText: { ...INSTANT_WIZARD_DEFAULT_BAKED_TEXT, enabled: false },
  };
}

export function isStudioSourcedPersistedImage(
  image: PersistedWizardImage | null | undefined
): boolean {
  return image?.imageSource === "studio";
}

export function isStudioSourcedWizardImage(
  image: InstantWizardLocalImage | null | undefined
): boolean {
  return image?.imageSource === "studio";
}

export function mapHandoffSceneToWizardLocalImage(
  scene: MotionHandoffPayload["scenes"][number]
): InstantWizardLocalImage | null {
  const persisted = mapHandoffSceneToPersistedImage(scene);
  if (!persisted) {
    return null;
  }
  return {
    id: persisted.id,
    originalFileName: persisted.originalFileName,
    mimeType: persisted.mimeType,
    sizeBytes: persisted.sizeBytes,
    optimizedBlob: EMPTY_WIZARD_IMAGE_BLOB,
    thumbnailBlob: EMPTY_WIZARD_IMAGE_BLOB,
    remoteWorkingUrl: persisted.remoteWorkingUrl,
    remoteThumbnailUrl: persisted.remoteThumbnailUrl,
    remoteStorageKey: persisted.remoteStorageKey,
    imageSource: "studio",
    studioSceneImageId: persisted.studioSceneImageId,
    studioImageReference: persisted.studioImageReference,
    bakedText: { ...INSTANT_WIZARD_DEFAULT_BAKED_TEXT, enabled: false },
    previewUnavailable: false,
  };
}

export function mapHandoffToPersistedWizardState(
  payload: MotionHandoffPayload,
  options?: {
    transitionSeconds?: InstantTransitionSeconds;
    instantMode?: InstantMode;
    executionPrefill?: MotionHandoffExecutionPrefill;
  }
): PersistedWizardState {
  const prefill = options?.executionPrefill ?? resolveMotionHandoffExecutionPrefill(payload);
  const instantMode = options?.instantMode ?? prefill.instantMode;
  const consumption = resolveMotionHandoffExecutionConsumption(payload, { instantMode });
  const transitionSeconds = options?.transitionSeconds ?? prefill.transitionSeconds;
  const durationBySceneId = new Map(
    prefill.sceneDurations.map((row) => [row.sceneId, row.durationSeconds])
  );
  const intelligence = buildMotionStudioIntelligenceSnapshot(payload);
  const sceneSlots: PersistedWizardSceneSlot[] = payload.scenes.map((scene) => ({
    sceneId: scene.sceneId,
    text: mapHandoffSceneToPersistedText(
      scene,
      transitionSeconds,
      durationBySceneId.get(scene.sceneId)
    ),
    image: mapHandoffSceneToPersistedImage(scene),
    studioContext: enrichStudioContextForMotion(scene, payload),
  }));

  const images = sceneSlots
    .map((slot) => slot.image)
    .filter((img): img is PersistedWizardImage => img !== null);

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    draftId: createWizardDraftId(),
    wizardFlowVersion: CREATOR_WIZARD_FLOW_VERSION,
    step: 1,
    stylePreset: "food_promo",
    motionText: payload.description.trim() || payload.title.trim(),
    continuityStrength: "balanced",
    chips: [],
    lockedTextMode: true,
    lockedTextLayers: [],
    chipTextBySlot: {},
    aspectRatio: "9:16",
    fastRenderMode: false,
    images,
    instantMode,
    transitionSeconds,
    durationSec: prefill.totalDurationSeconds,
    sceneSlots,
    sceneTexts: sceneSlots.map((slot) => slot.text),
    studioHandoff: {
      storyboardId: payload.storyboardId,
      storyboardTitle: payload.title,
      promptStyleProfile: payload.promptStyleProfile,
      handoffVersion: payload.version,
      importedAt: new Date().toISOString(),
      intelligence,
      executionReadiness: payload.executionReadiness,
      executionWarnings: payload.executionWarnings,
      executionPackage: payload.executionPackage,
      voiceMetadata: payload.voiceMetadata,
      subtitleAvailability: payload.subtitleAvailability,
      storedHandoff: sanitizeMotionHandoffForStorage(payload),
      executionPrefill: toMotionHandoffExecutionPrefillSummary(prefill),
      executionConsumption: toMotionExecutionConsumptionSummary(consumption),
    },
  };
}

export function enrichStudioContextForMotion(
  scene: MotionHandoffPayload["scenes"][number],
  payload?: MotionHandoffPayload
): StudioSceneContextMetadata {
  const ref = scene.sceneImageReference;
  const sceneIndex =
    payload ?
      [...payload.scenes].sort((a, b) => a.order - b.order).findIndex((s) => s.sceneId === scene.sceneId)
    : -1;
  const motionInstructions =
    payload && sceneIndex >= 0
      ? buildStudioSceneMotionInstructions({
          scene,
          sceneIndex,
          sceneCount: payload.scenes.length,
          aiDirectorNotes: payload.executionPackage?.aiDirectorNotes,
        })
      : undefined;
  return {
    ...scene.studioContext,
    sceneExecutionPackage: scene.sceneExecutionPackage,
    executionPrompt: scene.executionPrompt,
    studioMotionInstructions: motionInstructions?.text.trim() ? motionInstructions : undefined,
    studioTextBeats: scene.studioTextBeats,
    selectedSceneImageId: scene.selectedSceneImageId,
    preferredSceneImageUrl: scene.selectedSceneImageUrl,
    sceneImageReference: ref,
    imageSource: ref ? ("studio" as WizardImageSource) : undefined,
    selectedSceneImagePromptVersion: scene.selectedSceneImagePromptVersion,
    selectedSceneImageGenerationVersion: scene.selectedSceneImageGenerationVersion,
    studioQa: payload ? buildMotionSceneStudioQa(scene, payload) : undefined,
  };
}

export type WizardStudioSceneContext = StudioSceneContextMetadata;
