import { emptySceneTextDraft } from "@/components/instant/instant-mode-panel";
import { CREATOR_WIZARD_FLOW_VERSION } from "@/lib/creator-wizard-steps";
import type { AnimationSceneEmotionId } from "@/lib/animation-scene-emotions";
import {
  createWizardDraftId,
  type PersistedSceneTextDraft,
  type PersistedWizardSceneSlot,
  type PersistedWizardState,
} from "@/lib/instant-premium-wizard-storage";
import type { InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";
import { normalizeStorySceneDurationSeconds } from "@/lib/story-overlay-templates";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { StudioSceneContextMetadata } from "@/types/studio-scene-context";

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

export function mapHandoffSceneToPersistedText(
  scene: MotionHandoffPayload["scenes"][number],
  fallbackTransition: InstantTransitionSeconds = 5
): PersistedSceneTextDraft {
  const base = emptySceneTextDraft(fallbackTransition);
  const duration = normalizeStorySceneDurationSeconds(
    scene.durationSeconds,
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

export function mapHandoffToPersistedWizardState(
  payload: MotionHandoffPayload,
  options?: { transitionSeconds?: InstantTransitionSeconds }
): PersistedWizardState {
  const transitionSeconds = options?.transitionSeconds ?? 5;
  const sceneSlots: PersistedWizardSceneSlot[] = payload.scenes.map((scene) => ({
    sceneId: scene.sceneId,
    text: mapHandoffSceneToPersistedText(scene, transitionSeconds),
    image: null,
    studioContext: scene.studioContext,
  }));

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
    images: [],
    instantMode: "story",
    transitionSeconds,
    sceneSlots,
    sceneTexts: sceneSlots.map((slot) => slot.text),
    studioHandoff: {
      storyboardId: payload.storyboardId,
      storyboardTitle: payload.title,
      importedAt: new Date().toISOString(),
    },
  };
}

export type WizardStudioSceneContext = StudioSceneContextMetadata;
