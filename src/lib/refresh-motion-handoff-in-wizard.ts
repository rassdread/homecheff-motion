import type { InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";
import type { PersistedWizardState } from "@/lib/instant-premium-wizard-storage";
import { readPersistedWizardState, writePersistedWizardState } from "@/lib/instant-premium-wizard-storage";
import {
  mapHandoffSceneToPersistedImage,
  mapHandoffSceneToPersistedText,
  mapHandoffSceneToWizardLocalImage,
  isStudioSourcedWizardImage,
} from "@/lib/studio-motion-handoff-map";
import {
  restoreSceneTextDraft,
  type WizardSceneSlot,
} from "@/lib/instant-wizard-scene-slots";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

/**
 * Merge latest Studio handoff into live wizard slots (preserves manual image replacements).
 */
export function mergeHandoffIntoWizardSlots(
  slots: WizardSceneSlot[],
  payload: MotionHandoffPayload,
  transitionSeconds: InstantTransitionSeconds = 5
): WizardSceneSlot[] {
  const bySceneId = new Map(slots.map((slot) => [slot.sceneId, slot]));

  return payload.scenes.map((scene) => {
    const existing = bySceneId.get(scene.sceneId);
    const text = restoreSceneTextDraft(
      mapHandoffSceneToPersistedText(scene, transitionSeconds),
      transitionSeconds
    );
    const studioImage = mapHandoffSceneToWizardLocalImage(scene);

    let image = existing?.image ?? null;
    if (studioImage && (!image || isStudioSourcedWizardImage(image))) {
      image = studioImage;
    }

    return {
      sceneId: scene.sceneId,
      text,
      image,
      studioContext: {
        ...scene.studioContext,
        selectedSceneImageId: scene.selectedSceneImageId,
        preferredSceneImageUrl: scene.selectedSceneImageUrl,
        sceneImageReference: scene.sceneImageReference,
        imageSource: scene.sceneImageReference ? ("studio" as const) : undefined,
        selectedSceneImagePromptVersion: scene.selectedSceneImagePromptVersion,
        selectedSceneImageGenerationVersion: scene.selectedSceneImageGenerationVersion,
      },
    };
  });
}

export function mergeMotionHandoffRefresh(
  current: PersistedWizardState,
  payload: MotionHandoffPayload
): PersistedWizardState {
  const transitionSeconds = current.transitionSeconds ?? 5;
  const slotBySceneId = new Map(
    (current.sceneSlots ?? []).map((slot) => [slot.sceneId, slot])
  );

  const sceneSlots = payload.scenes.map((scene) => {
    const existing = slotBySceneId.get(scene.sceneId);
    const nextText = mapHandoffSceneToPersistedText(scene, transitionSeconds);
    const nextStudioImage = mapHandoffSceneToPersistedImage(scene);

    let image = existing?.image ?? null;
    if (nextStudioImage && (!image || nextStudioImage.imageSource === "studio")) {
      image = nextStudioImage;
    }

    return {
      sceneId: scene.sceneId,
      text: nextText,
      image,
      studioContext: {
        ...scene.studioContext,
        selectedSceneImageId: scene.selectedSceneImageId,
        preferredSceneImageUrl: scene.selectedSceneImageUrl,
        sceneImageReference: scene.sceneImageReference,
        imageSource: scene.sceneImageReference ? ("studio" as const) : undefined,
        selectedSceneImagePromptVersion: scene.selectedSceneImagePromptVersion,
        selectedSceneImageGenerationVersion: scene.selectedSceneImageGenerationVersion,
      },
    };
  });

  const images = sceneSlots
    .map((slot) => slot.image)
    .filter((img): img is NonNullable<typeof img> => img !== null);

  return {
    ...current,
    savedAt: new Date().toISOString(),
    motionText: payload.description.trim() || payload.title.trim(),
    sceneSlots,
    sceneTexts: sceneSlots.map((slot) => slot.text),
    images,
    studioHandoff: {
      storyboardId: payload.storyboardId,
      storyboardTitle: payload.title,
      promptStyleProfile: payload.promptStyleProfile,
      handoffVersion: payload.version,
      importedAt: new Date().toISOString(),
    },
  };
}

export function refreshPersistedWizardFromHandoff(payload: MotionHandoffPayload): PersistedWizardState {
  const current = readPersistedWizardState();
  if (!current) {
    throw new Error("No Motion wizard draft to refresh.");
  }
  if (current.studioHandoff?.storyboardId !== payload.storyboardId) {
    throw new Error("Handoff storyboard does not match the current draft.");
  }
  const merged = mergeMotionHandoffRefresh(current, payload);
  writePersistedWizardState(merged);
  return merged;
}
