/**
 * Publish AI Everything — one-click story proposal for photo/slideshow modes.
 */

import { buildPublishAiProposal, DEFAULT_PUBLISH_AI_ACCEPTANCE } from "@/lib/publish-ai-assistant";
import { proposalToChangePlan, savePublishChangePlanToMetadata } from "@/lib/publish-change-plan-apply";
import {
  addTimelineMusicItem,
  addTimelineVoiceItem,
  applyTimelineToPublishProject,
  savePublishTimelineToProject,
} from "@/lib/publish-timeline";
import {
  createPhotoStoryProject,
  createSlideshowProject,
  type PublishEntryMode,
} from "@/lib/publish-photo-story";
import type { PublishTimeline } from "@/types/publish-timeline";
import type { PublishProject } from "@/types/publish-overlay";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export function isPublishAiEverythingProject(project: PublishProject): boolean {
  return (
    project.metadata?.publishEntryMode === "ai_everything" ||
    project.workflow === "ai_everything" ||
    project.metadata?.aiEverythingMode === true
  );
}

export function createPublishAiEverythingProject(input: {
  name: string;
  imageUrl?: string;
  imageUrls?: string[];
  message?: string;
  durationSeconds?: number;
}): PublishProject {
  const entryMode = "ai_everything" as PublishEntryMode;
  const base =
    input.imageUrls && input.imageUrls.length >= 2
      ? createSlideshowProject({
          name: input.name,
          imageUrls: input.imageUrls,
          entryMode,
        })
      : createPhotoStoryProject({
          name: input.name,
          imageUrl: input.imageUrl ?? input.imageUrls?.[0] ?? "",
          durationSeconds: input.durationSeconds ?? 30,
          photoStoryMessage: input.message,
          entryMode,
        });

  return {
    ...base,
    workflow: "ai_everything",
    publishIntent: input.message ?? base.publishIntent,
    metadata: {
      ...base.metadata,
      aiEverythingMode: true,
      publishEntryMode: "ai_everything",
      publishAnalysisComplete: true,
    },
  };
}

/** Auto-build proposal, change plan, timeline — ready for review/export. */
export function runPublishAiEverythingPipeline(input: {
  project: PublishProject;
  hcProject?: HomeCheffProjectPackage | null;
}): PublishProject {
  const proposal = buildPublishAiProposal({ project: input.project, hcProject: input.hcProject });
  const acceptance = {
    ...DEFAULT_PUBLISH_AI_ACCEPTANCE,
    title: true,
    overlays: true,
    subtitles: true,
    voice: true,
    music: true,
    cta: true,
  };
  const plan = proposalToChangePlan(input.project.id, proposal, acceptance);

  let next = savePublishChangePlanToMetadata(input.project, plan);
  next = {
    ...next,
    metadata: {
      ...next.metadata,
      publishAnalysisComplete: true,
      publishAiEverythingComplete: true,
      publishScenes: proposal.scenes,
      musicDirection: proposal.musicDirection,
      voiceOverScript: proposal.voiceOverScript,
    },
  };

  const rawTimeline = next.metadata?.publishTimeline;
  if (rawTimeline && typeof rawTimeline === "object") {
    let timeline = rawTimeline as PublishTimeline;
    if (proposal.voiceOverScript) {
      timeline = addTimelineVoiceItem(timeline, { script: proposal.voiceOverScript, startTime: 0 });
    }
    timeline = addTimelineMusicItem(timeline, {
      mood: proposal.musicDirection,
      startTime: 0,
      endTime: next.durationSeconds,
    });
    next = savePublishTimelineToProject(next, { ...timeline, pendingRender: true, updatedAt: new Date().toISOString() });
  }

  return applyTimelineToPublishProject(next);
}
