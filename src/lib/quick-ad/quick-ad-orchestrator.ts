/**
 * Quick Ad orchestrator — preserves API; delegates to Simple Studio.
 */

import {
  generateSimpleStudioProject,
  reviseSimpleStudioProject,
  SIMPLE_STUDIO_EXPORT_ACTION,
  simpleStudioAdvancedEditorPath,
} from "@/lib/simple-studio/orchestrator";
import type { QuickAdIntent, QuickAdPlatform } from "@/lib/quick-ad/quick-ad-intent";
import type { PublishProject } from "@/types/publish-overlay";

export type QuickAdGenerateInput = {
  imageUrl: string;
  story: string;
  platforms?: QuickAdPlatform[];
  revisionInstruction?: string | null;
  existingProjectId?: string | null;
};

export type QuickAdGenerateResult = {
  project: PublishProject;
  intent: QuickAdIntent;
  pipelineMessage: string;
};

function toQuickAdIntent(
  story: string,
  platforms: QuickAdPlatform[] | undefined,
  fromSimple: ReturnType<typeof generateSimpleStudioProject>["intent"],
): QuickAdIntent {
  return {
    product: fromSimple.product,
    audience: fromSimple.audience,
    location: fromSimple.location,
    purpose: "social_ad",
    tone: fromSimple.tone,
    platforms: platforms?.length ? platforms : fromSimple.platforms,
    cta: fromSimple.cta,
    format: "9:16",
    durationSeconds: 20,
  };
}

export function generateQuickAdProject(input: QuickAdGenerateInput): QuickAdGenerateResult {
  const result = generateSimpleStudioProject({
    purpose: "advertisement",
    imageUrl: input.imageUrl,
    story: input.story,
    platforms: input.platforms,
    revisionInstruction: input.revisionInstruction,
    existingProjectId: input.existingProjectId,
  });
  return {
    project: result.project,
    intent: toQuickAdIntent(input.story, input.platforms, result.intent),
    pipelineMessage: result.pipelineMessage,
  };
}

export function reviseQuickAdProject(input: {
  project: PublishProject;
  revisionInstruction: string;
}): QuickAdGenerateResult {
  const result = reviseSimpleStudioProject(input);
  const story =
    typeof input.project.metadata?.quickAdStory === "string"
      ? input.project.metadata.quickAdStory
      : input.revisionInstruction;
  return {
    project: result.project,
    intent: toQuickAdIntent(story, undefined, result.intent),
    pipelineMessage: result.pipelineMessage,
  };
}

export const QUICK_AD_EXPORT_ACTION = SIMPLE_STUDIO_EXPORT_ACTION;
export const QUICK_AD_ADVANCED_EDITOR_PATH = simpleStudioAdvancedEditorPath;

/** @deprecated use inferQuickAdIntent — kept for type re-exports */
export type { QuickAdIntent, QuickAdPlatform };
