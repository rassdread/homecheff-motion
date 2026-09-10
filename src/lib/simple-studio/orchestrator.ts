/**
 * Canonical Simple Studio orchestrator.
 * Reuses Publish AI Everything / photo_story pipeline — no new generation engine.
 * Quick Ad is a purpose=advertisement specialization.
 */

import {
  createPublishAiEverythingProject,
  runPublishAiEverythingPipeline,
} from "@/lib/publish-ai-everything";
import { savePublishProject } from "@/lib/publish-overlay-session";
import type {
  SimpleStudioIntent,
  SimpleStudioPlatform,
  SimpleStudioPurpose,
} from "@/lib/simple-studio/catalog";
import {
  buildSimpleStudioPipelineMessage,
  inferSimpleStudioIntent,
  simpleStudioProjectName,
} from "@/lib/simple-studio/intent-infer";
import type { PublishProject } from "@/types/publish-overlay";

export type SimpleStudioGenerateInput = {
  purpose: SimpleStudioPurpose;
  imageUrl: string;
  story: string;
  platforms?: SimpleStudioPlatform[];
  revisionInstruction?: string | null;
  existingProjectId?: string | null;
};

export type SimpleStudioGenerateResult = {
  project: PublishProject;
  intent: SimpleStudioIntent;
  pipelineMessage: string;
};

export function generateSimpleStudioProject(
  input: SimpleStudioGenerateInput,
): SimpleStudioGenerateResult {
  const story = input.story.trim();
  if (!story) throw new Error("SIMPLE_STUDIO_STORY_REQUIRED");
  if (!input.imageUrl?.trim()) throw new Error("SIMPLE_STUDIO_PHOTO_REQUIRED");

  const intent = inferSimpleStudioIntent({
    story,
    purpose: input.purpose,
    platforms: input.platforms,
  });
  const pipelineMessage = buildSimpleStudioPipelineMessage({
    story,
    intent,
    revisionInstruction: input.revisionInstruction,
  });

  let project = createPublishAiEverythingProject({
    name: simpleStudioProjectName(intent, story),
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
      simpleStudio: true,
      simpleStudioPurpose: input.purpose,
      /** Backward-compatible Quick Ad markers when purpose is advertisement. */
      quickAd: input.purpose === "advertisement",
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

export function reviseSimpleStudioProject(input: {
  project: PublishProject;
  revisionInstruction: string;
}): SimpleStudioGenerateResult {
  const story =
    typeof input.project.metadata?.quickAdStory === "string"
      ? input.project.metadata.quickAdStory
      : String(input.project.metadata?.photoStoryMessage ?? input.project.publishIntent ?? "");
  const imageUrl = input.project.imageUrl || input.project.videoUrl || "";
  const platforms = Array.isArray(input.project.metadata?.quickAdPlatforms)
    ? (input.project.metadata.quickAdPlatforms as SimpleStudioPlatform[])
    : undefined;
  const purposeRaw = input.project.metadata?.simpleStudioPurpose;
  const purpose =
    typeof purposeRaw === "string"
      ? (purposeRaw as SimpleStudioPurpose)
      : input.project.metadata?.quickAd
        ? "advertisement"
        : "advertisement";

  return generateSimpleStudioProject({
    purpose,
    imageUrl,
    story,
    platforms,
    revisionInstruction: input.revisionInstruction,
    existingProjectId: input.project.id,
  });
}

export const SIMPLE_STUDIO_EXPORT_ACTION = "publish_photo_story" as const;
export const simpleStudioAdvancedEditorPath = (projectId: string) =>
  `/publish?project=${encodeURIComponent(projectId)}`;
