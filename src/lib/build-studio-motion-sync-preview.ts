import {
  mapHandoffSceneToPersistedText,
  mapStudioEmotionToMotion,
} from "@/lib/studio-motion-handoff-map";
import { detectStudioIntelligenceStaleness } from "@/lib/detect-studio-intelligence-staleness";
import { parseInstantSceneTexts, type InstantSceneText } from "@/lib/story-overlay-templates";
import type { InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type {
  StudioMotionSyncPreview,
  StudioMotionSyncScenePreview,
} from "@/types/studio-motion-sync";
import type { StudioIntelligenceStalenessResult } from "@/types/studio-project-persistence";

function norm(s: string | null | undefined): string {
  return (s ?? "").trim();
}

function emotionLabel(scene: InstantSceneText): string | null {
  if (scene.emotionMode === "manual" && scene.emotion) {
    return scene.emotion;
  }
  if (scene.autoEmotion) {
    return `auto:${scene.autoEmotion}`;
  }
  return scene.emotionMode ?? null;
}

function durationForScene(
  scene: InstantSceneText | undefined,
  fallback: number
): number | null {
  if (!scene) {
    return null;
  }
  return scene.transitionDurationSeconds ?? scene.durationSeconds ?? fallback;
}

function textsEqual(a: string, b: string): boolean {
  return norm(a) === norm(b);
}

export function buildStudioMotionSyncPreview(params: {
  projectId: string;
  storyboardId: string;
  storyboardTitle: string;
  storedHandoff: unknown;
  latestHandoff: MotionHandoffPayload;
  images: Array<{
    id: string;
    order: number;
    previewUrl: string | null;
    studioSceneId: string | null;
    studioSceneImageId: string | null;
  }>;
  instantSceneTexts: unknown;
  instantTransitionSeconds: InstantTransitionSeconds;
  staleness?: StudioIntelligenceStalenessResult | null;
}): StudioMotionSyncPreview {
  const transitionSeconds = params.instantTransitionSeconds;
  const motionScenes = parseInstantSceneTexts(params.instantSceneTexts);
  const studioScenes = [...params.latestHandoff.scenes].sort((a, b) => a.order - b.order);
  const storedScenes =
    params.storedHandoff && typeof params.storedHandoff === "object" && !Array.isArray(params.storedHandoff)
      ? [...(((params.storedHandoff as { scenes?: unknown }).scenes as MotionHandoffPayload["scenes"]) ?? [])].sort(
          (a, b) => a.order - b.order
        )
      : [];

  const maxRows = Math.max(params.images.length, studioScenes.length, motionScenes.length);
  const scenes: StudioMotionSyncScenePreview[] = [];
  const warnings: string[] = [];
  let hasManualMotionEdits = false;

  const requiresRemoveConfirmation = studioScenes.length < params.images.length;
  const requiresAddConfirmation = studioScenes.length > params.images.length;
  if (requiresRemoveConfirmation) {
    warnings.push(
      `Studio has ${studioScenes.length} scene(s); Motion has ${params.images.length}. Removing extra Motion scenes requires confirmation.`
    );
  }
  if (requiresAddConfirmation) {
    warnings.push(
      `Studio has ${studioScenes.length} scene(s); Motion has ${params.images.length}. Adding scenes requires confirmation.`
    );
  }

  let anyImage = false;
  let anyText = false;
  let anyEmotion = false;
  let anyDuration = false;
  let anyMeta = false;

  for (let order = 0; order < maxRows; order += 1) {
    const image = params.images[order];
    const studio = studioScenes[order];
    const stored = storedScenes[order];
    const motionText = motionScenes[order];
    const mapped = studio ? mapHandoffSceneToPersistedText(studio, transitionSeconds) : null;

    const currentUrl = image?.previewUrl?.trim() ?? null;
    const latestUrl = studio?.selectedSceneImageUrl?.trim() ?? null;
    const storedUrl = stored?.selectedSceneImageUrl?.trim() ?? null;
    const imageChanged = Boolean(latestUrl && currentUrl !== latestUrl);
    if (imageChanged) {
      anyImage = true;
    }

    const manualImageEdit =
      Boolean(image) &&
      Boolean(storedUrl) &&
      currentUrl !== storedUrl &&
      (image?.studioSceneImageId !== stored?.selectedSceneImageId ||
        !image?.studioSceneImageId);
    if (manualImageEdit) {
      hasManualMotionEdits = true;
    }

    const currentTitle = norm(motionText?.title);
    const latestTitle = norm(studio?.title);
    const titleChanged = Boolean(mapped && !textsEqual(currentTitle, latestTitle));
    if (titleChanged) {
      anyText = true;
    }

    const currentSubtitle = norm(motionText?.subtitle);
    const latestSubtitle = norm(studio?.description);
    const subtitleChanged = Boolean(mapped && !textsEqual(currentSubtitle, latestSubtitle));
    if (subtitleChanged) {
      anyText = true;
    }

    const latestEmotion = norm(studio?.emotion);
    const currentEmotion = motionText ? emotionLabel(motionText) : null;
    let emotionChanged = false;
    if (studio) {
      const mappedEmotion = mapStudioEmotionToMotion(studio.emotion);
      const latestEmotionLabel =
        mappedEmotion.emotionMode === "manual" ? mappedEmotion.emotion : "auto";
      emotionChanged =
        currentEmotion !==
        (mappedEmotion.emotionMode === "manual" ? mappedEmotion.emotion : `auto:${latestEmotionLabel}`);
    }
    if (emotionChanged) {
      anyEmotion = true;
    }

    const currentDuration = durationForScene(motionText, transitionSeconds);
    const latestDuration = studio?.durationSeconds ?? null;
    const durationChanged =
      latestDuration !== null &&
      currentDuration !== null &&
      Math.abs(latestDuration - currentDuration) >= 1;
    if (durationChanged) {
      anyDuration = true;
    }

    const metadataChanged =
      Boolean(studio) &&
      (stored?.selectedSceneImagePromptVersion !== studio.selectedSceneImagePromptVersion ||
        stored?.selectedSceneImageGenerationVersion !== studio.selectedSceneImageGenerationVersion);

    if (metadataChanged) {
      anyMeta = true;
    }

    const manualTextEdit =
      Boolean(mapped && motionText) &&
      Boolean(stored) &&
      (!textsEqual(norm(motionText?.title), norm(stored.title)) ||
        !textsEqual(norm(motionText?.subtitle), norm(stored.description)));
    if (manualTextEdit) {
      hasManualMotionEdits = true;
    }

    scenes.push({
      order,
      sceneId: studio?.sceneId ?? image?.studioSceneId ?? `motion-${order}`,
      studioSceneId: studio?.sceneId ?? null,
      currentMotionImageId: image?.id ?? null,
      currentMotionImageUrl: currentUrl,
      currentStudioSceneImageId: image?.studioSceneImageId ?? null,
      latestStudioImageUrl: latestUrl,
      imageChanged,
      currentTitle,
      latestStudioTitle: latestTitle,
      titleChanged,
      currentSubtitle,
      latestStudioSubtitle: latestSubtitle,
      subtitleChanged,
      currentEmotion,
      latestStudioEmotion: latestEmotion || null,
      emotionChanged,
      currentDurationSeconds: currentDuration,
      latestStudioDurationSeconds: latestDuration,
      durationChanged,
      metadataChanged,
      manualImageEdit,
      manualTextEdit,
    });
  }

  const staleness =
    params.staleness ??
    detectStudioIntelligenceStaleness({
      storedHandoff: params.storedHandoff,
      latestHandoff: params.latestHandoff,
      compareDriftLists: true,
    });

  const hasChanges =
    anyImage || anyText || anyEmotion || anyDuration || anyMeta || staleness.isStale;

  return {
    projectId: params.projectId,
    storyboardId: params.storyboardId,
    storyboardTitle: params.storyboardTitle,
    motionSceneCount: params.images.length,
    studioSceneCount: studioScenes.length,
    scenes,
    hasChanges,
    hasManualMotionEdits,
    requiresRemoveConfirmation,
    requiresAddConfirmation,
    suggestedDefaults: {
      syncImages: anyImage || staleness.reasons.some((r) => r.code.includes("image")),
      syncTexts: anyText,
      syncEmotions: anyEmotion,
      syncDurations: anyDuration,
      syncContext: staleness.isStale || anyMeta,
    },
    staleness,
    warnings,
  };
}
