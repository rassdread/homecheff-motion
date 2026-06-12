import type { PublishProject } from "@/types/publish-overlay";
import { createPublishProject } from "@/lib/publish-overlay-session";
import { createPublishTimeline } from "@/lib/publish-timeline";

export type PhotoStoryDuration = 10 | 20 | 30 | 60 | number;

export type PublishEntryMode =
  | "video_enhancement"
  | "photo_story"
  | "slideshow"
  | "social_video"
  | "poster"
  | "flyer"
  | "voice_message"
  | "audio_with_image"
  | "ai_everything"
  | "ad"
  | "vertical_video";

export function createPhotoStoryProject(input: {
  name: string;
  imageUrl: string;
  durationSeconds?: PhotoStoryDuration;
  photoStoryMessage?: string;
  entryMode?: PublishEntryMode;
}): PublishProject {
  const duration = input.durationSeconds ?? 30;
  const timeline = createPublishTimeline("pending", duration);
  timeline.items.push({
    id: "photo_base",
    kind: "photo_base",
    label: "Photo",
    startTime: 0,
    endTime: duration,
    track: 0,
    imageUrl: input.imageUrl,
  });

  const project = createPublishProject({
    name: input.name,
    videoUrl: input.imageUrl,
    imageUrl: input.imageUrl,
    mediaKind: "image",
    durationSeconds: duration,
    source: "upload",
    workflow: "photo_story",
    publishIntent: input.entryMode ?? "photo_story",
    metadata: {
      publishEntryMode: input.entryMode ?? "photo_story",
      photoStoryMessage: input.photoStoryMessage,
      publishTimeline: { ...timeline, projectId: "pending", durationSeconds: duration },
      renderMode: "ken_burns",
    },
  });

  const timelineWithId = { ...timeline, projectId: project.id };
  return { ...project, metadata: { ...project.metadata, publishTimeline: timelineWithId } };
}

export function createSlideshowProject(input: {
  name: string;
  imageUrls: string[];
  slideDurationSeconds?: number;
  entryMode?: PublishEntryMode;
}): PublishProject {
  const slideDur = input.slideDurationSeconds ?? 4;
  const duration = slideDur * input.imageUrls.length;
  const timeline = createPublishTimeline("pending", duration);
  let t = 0;
  for (const [i, url] of input.imageUrls.entries()) {
    timeline.items.push({
      id: `slide_${i}`,
      kind: "slide",
      label: `Slide ${i + 1}`,
      startTime: t,
      endTime: t + slideDur,
      track: 0,
      imageUrl: url,
    });
    t += slideDur;
  }

  const project = createPublishProject({
    name: input.name,
    videoUrl: input.imageUrls[0]!,
    imageUrl: input.imageUrls[0],
    imageUrls: input.imageUrls,
    mediaKind: "carousel",
    durationSeconds: duration,
    source: "upload",
    workflow: "slideshow",
    publishIntent: input.entryMode ?? "slideshow",
    metadata: {
      publishEntryMode: input.entryMode ?? "slideshow",
      publishTimeline: { ...timeline, projectId: "pending", durationSeconds: duration },
      renderMode: "slideshow",
    },
  });

  return { ...project, metadata: { ...project.metadata, publishTimeline: { ...timeline, projectId: project.id } } };
}

export function isPhotoStoryProject(project: PublishProject): boolean {
  return project.workflow === "photo_story" || project.metadata?.renderMode === "ken_burns";
}

export function isSlideshowProject(project: PublishProject): boolean {
  return project.workflow === "slideshow" || project.metadata?.renderMode === "slideshow";
}
