/**
 * Quick Ad orchestrator — thin layer over Publish AI Everything / photo_story.
 * Preview generation is local (existing heuristics). Export uses existing HC gate.
 */

import {
  createPublishAiEverythingProject,
  runPublishAiEverythingPipeline,
} from "@/lib/publish-ai-everything";
import { savePublishProject } from "@/lib/publish-overlay-session";
import {
  buildQuickAdPipelineMessage,
  inferQuickAdIntent,
  quickAdProjectName,
  type QuickAdIntent,
  type QuickAdPlatform,
} from "@/lib/quick-ad/quick-ad-intent";
import type { PublishProject } from "@/types/publish-overlay";

export type QuickAdGenerateInput = {
  imageUrl: string;
  story: string;
  platforms?: QuickAdPlatform[];
  revisionInstruction?: string | null;
  /** Preserve project id across revisions when possible. */
  existingProjectId?: string | null;
};

export type QuickAdGenerateResult = {
  project: PublishProject;
  intent: QuickAdIntent;
  pipelineMessage: string;
};

export function generateQuickAdProject(input: QuickAdGenerateInput): QuickAdGenerateResult {
  const story = input.story.trim();
  if (!story) throw new Error("QUICK_AD_STORY_REQUIRED");
  if (!input.imageUrl?.trim()) throw new Error("QUICK_AD_PHOTO_REQUIRED");

  const intent = inferQuickAdIntent({
    story,
    platforms: input.platforms,
  });
  const pipelineMessage = buildQuickAdPipelineMessage({
    story,
    intent,
    revisionInstruction: input.revisionInstruction,
  });

  let project = createPublishAiEverythingProject({
    name: quickAdProjectName(intent, story),
    imageUrl: input.imageUrl,
    message: pipelineMessage,
    durationSeconds: intent.durationSeconds,
  });

  if (input.existingProjectId?.trim()) {
    project = { ...project, id: input.existingProjectId.trim() };
  }

  project = {
    ...project,
    metadata: {
      ...project.metadata,
      quickAd: true,
      quickAdStory: story,
      quickAdPlatforms: intent.platforms,
      quickAdCta: intent.cta,
      quickAdTone: intent.tone,
      quickAdRevision: input.revisionInstruction?.trim() || null,
      publishEntryMode: "ai_everything",
      aspectRatio: "9:16",
    },
  };

  project = runPublishAiEverythingPipeline({ project });
  savePublishProject(project);

  return { project, intent, pipelineMessage };
}

export function reviseQuickAdProject(input: {
  project: PublishProject;
  revisionInstruction: string;
}): QuickAdGenerateResult {
  const story =
    typeof input.project.metadata?.quickAdStory === "string"
      ? input.project.metadata.quickAdStory
      : String(input.project.metadata?.photoStoryMessage ?? input.project.publishIntent ?? "");
  const imageUrl = input.project.imageUrl || input.project.videoUrl || "";
  const platforms = Array.isArray(input.project.metadata?.quickAdPlatforms)
    ? (input.project.metadata.quickAdPlatforms as QuickAdPlatform[])
    : undefined;

  return generateQuickAdProject({
    imageUrl,
    story,
    platforms,
    revisionInstruction: input.revisionInstruction,
    existingProjectId: input.project.id,
  });
}

export const QUICK_AD_EXPORT_ACTION = "publish_photo_story" as const;
export const QUICK_AD_ADVANCED_EDITOR_PATH = (projectId: string) =>
  `/publish?project=${encodeURIComponent(projectId)}`;
