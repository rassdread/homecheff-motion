/**
 * S2C — CONTINUE_IN_STUDIO destination resolver (no UI redesign).
 */

import { classifyPresetSource } from "@/lib/studio-preset-lifecycle";
import type {
  StudioPresetLifecycleClass,
  StudioPresetSourceType,
} from "@/types/studio-preset-production-context";

export type ContinueInStudioDestination =
  | "image_editor"
  | "motion_project"
  | "canonical_single_scene"
  | "storyboard_workspace"
  | "none";

export const CONTINUE_IN_STUDIO_COPY = {
  nl: "Verder in Studio",
  en: "Continue in Studio",
} as const;

export function resolveContinueInStudioDestination(
  lifecycleClass: StudioPresetLifecycleClass
): ContinueInStudioDestination {
  switch (lifecycleClass) {
    case "IMAGE_ONLY":
      return "image_editor";
    case "MOTION_ONLY":
      return "motion_project";
    case "CANONICAL_SINGLE_SCENE":
    case "QUICK_WITH_CONTINUE":
      return "canonical_single_scene";
    case "CANONICAL_MULTI_SCENE":
    case "ADVANCED_STORY":
      return "storyboard_workspace";
    case "QUICK_ONE_SHOT":
    case "LEGACY":
    case "BLOCKED":
    case "MISSING_INPUT":
      return "none";
  }
}

export function shouldShowContinueInStudio(input: {
  lifecycleClass: StudioPresetLifecycleClass;
  alreadyInCanonicalWorkspace?: boolean;
}): boolean {
  if (input.alreadyInCanonicalWorkspace) return false;
  return resolveContinueInStudioDestination(input.lifecycleClass) !== "none";
}

/**
 * Browser destination after materialization (or when project already exists).
 * Deferred Continue without a storyboardId uses POST /api/studio/preset-materialize.
 */
export function continueInStudioHref(input: {
  sourceType: StudioPresetSourceType;
  sourceId: string;
  storyboardId?: string | null;
  stage?: string | null;
}): string | null {
  const classification = classifyPresetSource({
    sourceType: input.sourceType,
    sourceId: input.sourceId,
  });
  if (!classification.continuationSupported) return null;
  if (input.storyboardId) {
    const params = new URLSearchParams({
      storyboardId: input.storyboardId,
      continueInStudio: "1",
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    });
    if (input.stage) {
      params.set("stage", input.stage);
    }
    return `/studio?${params.toString()}`;
  }
  return null;
}

export function continueInStudioPostPath(): string {
  return "/api/studio/preset-materialize";
}
