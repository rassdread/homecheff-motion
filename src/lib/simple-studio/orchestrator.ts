/**
 * Canonical Simple Studio orchestrator (Creative Plan V2 + executable chain).
 * Reuses Publish AI Everything / slideshow / audio mux — no fake lipsync.
 */

import {
  createPublishAiEverythingProject,
  runPublishAiEverythingPipeline,
} from "@/lib/publish-ai-everything";
import {
  defaultPublishProductionConfig,
  savePublishProductionToProject,
} from "@/lib/publish-media-production";
import { savePublishProject } from "@/lib/publish-overlay-session";
import type {
  SimpleStudioIntent,
  SimpleStudioPlatform,
  SimpleStudioPurpose,
} from "@/lib/simple-studio/catalog";
import type {
  SimpleStudioCreativePlan,
  SimpleStudioMediaItem,
} from "@/lib/simple-studio/creative-plan";
import { summarizeCreativePlanNl } from "@/lib/simple-studio/creative-plan";
import { buildCreativePlanV2 } from "@/lib/simple-studio/intent-routing";
import {
  buildSimpleStudioPipelineMessage,
  inferSimpleStudioIntent,
  simpleStudioProjectName,
} from "@/lib/simple-studio/intent-infer";
import type { PublishProject } from "@/types/publish-overlay";

export type SimpleStudioGenerateInput = {
  purpose: SimpleStudioPurpose | "universal";
  /** @deprecated prefer media[] */
  imageUrl?: string;
  media?: SimpleStudioMediaItem[];
  story: string;
  platforms?: SimpleStudioPlatform[];
  revisionInstruction?: string | null;
  existingProjectId?: string | null;
  /** Resolved audio URLs from prepare-audio API */
  voiceAudioUrl?: string | null;
  musicTrackUrl?: string | null;
  musicTrackId?: string | null;
  musicLabel?: string | null;
};

export type SimpleStudioGenerateResult = {
  project: PublishProject;
  intent: SimpleStudioIntent;
  plan: SimpleStudioCreativePlan;
  pipelineMessage: string;
  summaryNl: ReturnType<typeof summarizeCreativePlanNl>;
};

function normalizeMedia(input: SimpleStudioGenerateInput): SimpleStudioMediaItem[] {
  if (input.media && input.media.length > 0) return input.media;
  if (input.imageUrl?.trim()) {
    return [
      {
        id: "m0",
        kind: "image",
        url: input.imageUrl.trim(),
      },
    ];
  }
  return [];
}

export function buildSimpleStudioPlan(input: {
  purpose: SimpleStudioPurpose | "universal";
  media: SimpleStudioMediaItem[];
  story: string;
  platforms?: SimpleStudioPlatform[];
  revisionInstruction?: string | null;
}): SimpleStudioCreativePlan {
  return buildCreativePlanV2({
    story: input.story,
    media: input.media,
    purposeHint: input.purpose,
    platforms: input.platforms,
    revisionInstruction: input.revisionInstruction,
  });
}

export function generateSimpleStudioProject(
  input: SimpleStudioGenerateInput,
): SimpleStudioGenerateResult {
  const story = input.story.trim();
  if (!story) throw new Error("SIMPLE_STUDIO_STORY_REQUIRED");
  const media = normalizeMedia(input);
  const images = media.filter((m) => m.kind === "image");
  const videos = media.filter((m) => m.kind === "video");
  if (images.length === 0 && videos.length === 0) {
    throw new Error("SIMPLE_STUDIO_MEDIA_REQUIRED");
  }

  const plan = buildSimpleStudioPlan({
    purpose: input.purpose,
    media,
    story,
    platforms: input.platforms,
    revisionInstruction: input.revisionInstruction,
  });

  if (plan.engineChain.includes("motion_deeplink")) {
    throw new Error("SIMPLE_STUDIO_DEEPLINK_MOTION");
  }
  if (plan.engineChain.includes("photo_video_deeplink")) {
    throw new Error("SIMPLE_STUDIO_DEEPLINK_PHOTO_VIDEO");
  }

  const intent = inferSimpleStudioIntent({
    story,
    purpose: plan.purpose,
    platforms: input.platforms,
  });

  const pipelineMessage = buildSimpleStudioPipelineMessage({
    story: plan.dialogue
      ? `${story}\n\nGesproken tekst: ${plan.dialogue}`
      : story,
    intent,
    revisionInstruction: input.revisionInstruction,
  });

  const imageUrls = images.map((m) => m.url);
  const primaryImage = imageUrls[0] ?? videos[0]?.url ?? "";

  let project =
    videos.length > 0 && images.length === 0
      ? createPublishAiEverythingProject({
          name: simpleStudioProjectName(intent, story),
          imageUrl: primaryImage,
          message: pipelineMessage,
          durationSeconds: plan.durationSeconds,
        })
      : createPublishAiEverythingProject({
          name: simpleStudioProjectName(intent, story),
          imageUrl: primaryImage,
          imageUrls: imageUrls.length >= 2 ? imageUrls : undefined,
          message: pipelineMessage,
          durationSeconds: plan.durationSeconds,
        });

  if (videos.length > 0 && images.length === 0) {
    project = {
      ...project,
      videoUrl: videos[0]!.url,
      metadata: {
        ...project.metadata,
        publishEntryMode: "video_enhancement",
        renderMode: "video_overlay",
      },
    };
  }

  if (input.existingProjectId?.trim()) {
    project = { ...project, id: input.existingProjectId.trim() };
  }

  project = {
    ...project,
    durationSeconds: plan.durationSeconds,
    metadata: {
      ...project.metadata,
      simpleStudio: true,
      simpleStudioPurpose: plan.purpose,
      simpleStudioPlan: plan,
      quickAd: plan.purpose === "advertisement",
      quickAdStory: story,
      quickAdPlatforms: intent.platforms,
      quickAdCta: plan.cta,
      quickAdTone: intent.tone,
      quickAdRevision: input.revisionInstruction?.trim() || null,
      publishEntryMode:
        videos.length > 0 && images.length === 0
          ? "video_enhancement"
          : "ai_everything",
      aspectRatio: plan.aspectRatio,
    },
  };

  project = runPublishAiEverythingPipeline({ project });

  // Attach real production audio config when prepare-audio resolved URLs.
  const production = defaultPublishProductionConfig();
  if (plan.voice.required) {
    production.voice = {
      ...production.voice,
      mode: "ai_voice",
      label: plan.voice.profile,
      language: plan.voice.language,
      gender: plan.voice.gender === "auto" ? "female" : plan.voice.gender,
      script: plan.dialogue || plan.narration || story.slice(0, 500),
      audioUrl: input.voiceAudioUrl?.trim() || undefined,
      volume: 100,
    };
  }
  if (plan.music.required && plan.music.mood !== "none") {
    production.music = {
      ...production.music,
      mode: input.musicTrackUrl ? "library" : "generate",
      label: input.musicLabel || plan.music.mood,
      mood: plan.music.mood,
      trackId: input.musicTrackId || undefined,
      trackUrl: input.musicTrackUrl?.trim() || undefined,
      volume: plan.music.volume,
      fadeIn: true,
      fadeOut: true,
      durationMatch: true,
      instrumental: true,
    };
  } else if (plan.music.mood === "none") {
    production.music = { ...production.music, mode: "none" };
  }
  project = savePublishProductionToProject(project, production);

  savePublishProject(project);

  return {
    project,
    intent,
    plan,
    pipelineMessage,
    summaryNl: summarizeCreativePlanNl(plan, null),
  };
}

export function reviseSimpleStudioProject(input: {
  project: PublishProject;
  revisionInstruction: string;
  voiceAudioUrl?: string | null;
  musicTrackUrl?: string | null;
  musicTrackId?: string | null;
  musicLabel?: string | null;
}): SimpleStudioGenerateResult {
  const story =
    typeof input.project.metadata?.quickAdStory === "string"
      ? input.project.metadata.quickAdStory
      : String(input.project.metadata?.photoStoryMessage ?? input.project.publishIntent ?? "");
  const priorPlan = input.project.metadata?.simpleStudioPlan as
    | SimpleStudioCreativePlan
    | undefined;
  const media: SimpleStudioMediaItem[] =
    priorPlan?.sourceMedia?.length
      ? priorPlan.sourceMedia
      : [
          {
            id: "m0",
            kind: "image",
            url: input.project.imageUrl || input.project.videoUrl || "",
          },
        ];
  const platforms = Array.isArray(input.project.metadata?.quickAdPlatforms)
    ? (input.project.metadata.quickAdPlatforms as SimpleStudioPlatform[])
    : undefined;
  const purposeRaw = input.project.metadata?.simpleStudioPurpose;
  const purpose =
    typeof purposeRaw === "string"
      ? (purposeRaw as SimpleStudioPurpose)
      : "advertisement";

  return generateSimpleStudioProject({
    purpose,
    media,
    story,
    platforms,
    revisionInstruction: input.revisionInstruction,
    existingProjectId: input.project.id,
    voiceAudioUrl: input.voiceAudioUrl,
    musicTrackUrl: input.musicTrackUrl,
    musicTrackId: input.musicTrackId,
    musicLabel: input.musicLabel,
  });
}

export function simpleStudioExportActionForPlan(
  plan: SimpleStudioCreativePlan,
): "publish_photo_story" | "publish_slideshow" | "publish_mp4_export" {
  if (plan.engineChain.includes("slideshow")) return "publish_slideshow";
  if (plan.engineChain.includes("video_overlay")) return "publish_mp4_export";
  return "publish_photo_story";
}

/** @deprecated use simpleStudioExportActionForPlan */
export const SIMPLE_STUDIO_EXPORT_ACTION = "publish_photo_story" as const;
export const simpleStudioAdvancedEditorPath = (projectId: string) =>
  `/publish?project=${encodeURIComponent(projectId)}`;
