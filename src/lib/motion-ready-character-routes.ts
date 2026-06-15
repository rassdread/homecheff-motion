import { buildCharacterClusterHref } from "@/lib/character-cluster-routes";
import type { EditorPostUploadMode } from "@/lib/editor-start-flow";
import type { CharacterClusterProjectContext } from "@/types/character-cluster";

export type MotionReadyWizardLaunchContext = CharacterClusterProjectContext;

export const MOTION_READY_CHARACTER_WIZARD_PATH = "/studio/characters/motion-ready";

/** Canonical href for the Motion-ready Character Wizard. */
export function buildMotionReadyCharacterWizardHref(
  context?: MotionReadyWizardLaunchContext
): string {
  return buildCharacterClusterHref("motion-ready", context);
}

/** Whether a CTA should navigate to the motion-ready wizard instead of the Editor. */
export function resolvesToMotionReadyWizard(input: {
  workflow?: EditorPostUploadMode | string | null;
  entry?: string | null;
  actionId?: string | null;
  suggestionId?: string | null;
}): boolean {
  const workflow = input.workflow?.trim();
  const entry = input.entry?.trim();
  const action = (input.actionId ?? input.suggestionId)?.trim();
  return (
    workflow === "motion_prepare" ||
    entry === "prepare_for_animation" ||
    action === "motion_ready" ||
    action === "animation_ready" ||
    action === "animate" ||
    action === "animation_ready_character"
  );
}

export function buildMotionReadyHrefFromEditorDocument(input: {
  backgroundUrl?: string | null;
  backgroundStorageKey?: string | null;
  name?: string | null;
  sessionId?: string | null;
  sourceAssetId?: string | null;
  hcProjectId?: string | null;
  storyboardId?: string | null;
  sceneId?: string | null;
  returnTo?: string | null;
}): string {
  return buildMotionReadyCharacterWizardHref({
    sourceImage: input.backgroundUrl?.trim() || undefined,
    sourceAsset: input.sourceAssetId?.trim() || input.sessionId?.trim() || undefined,
    sourceName: input.name?.trim() || undefined,
    hcProject: input.hcProjectId?.trim() || undefined,
    storyboardId: input.storyboardId?.trim() || undefined,
    sceneId: input.sceneId?.trim() || undefined,
    returnTo: input.returnTo?.trim() || undefined,
  });
}

export function buildMotionReadyHrefFromWizardDraft(input: {
  sourceReferenceImageUrl?: string | null;
  referenceImageUrl?: string | null;
  sourceReferenceStorageKey?: string | null;
  referenceStorageKey?: string | null;
  name?: string | null;
  sourceAssetId?: string | null;
  hcProjectId?: string | null;
  storyboardId?: string | null;
  sceneId?: string | null;
}): string {
  const sourceImage = input.sourceReferenceImageUrl?.trim() || input.referenceImageUrl?.trim();
  return buildMotionReadyCharacterWizardHref({
    sourceImage: sourceImage || undefined,
    sourceAsset: input.sourceAssetId?.trim() || undefined,
    sourceName: input.name?.trim() || undefined,
    hcProject: input.hcProjectId?.trim() || undefined,
    storyboardId: input.storyboardId?.trim() || undefined,
    sceneId: input.sceneId?.trim() || undefined,
  });
}
