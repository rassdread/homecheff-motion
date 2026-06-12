import type { PublishProject } from "@/types/publish-overlay";
import { createPublishProject } from "@/lib/publish-overlay-session";
import { createPublishTimeline, addTimelineVoiceItem, addTimelineMusicItem } from "@/lib/publish-timeline";
import type { PublishEntryMode } from "@/lib/publish-photo-story";

export function createVoiceMessageProject(input: {
  name: string;
  audioUrl: string;
  coverImageUrl?: string;
  message?: string;
  durationSeconds?: number;
  entryMode?: PublishEntryMode;
  voiceInputMode?: "record" | "upload" | "generate";
}): PublishProject {
  const duration = input.durationSeconds ?? 30;
  let timeline = createPublishTimeline("pending", duration);
  timeline = addTimelineVoiceItem(timeline, {
    script: input.message ?? "Voice message",
    startTime: 0,
  });
  if (input.coverImageUrl) {
    timeline.items.push({
      id: "cover_image",
      kind: "photo_base",
      label: "Cover",
      startTime: 0,
      endTime: duration,
      track: 0,
      imageUrl: input.coverImageUrl,
    });
  }

  const project = createPublishProject({
    name: input.name,
    videoUrl: input.coverImageUrl ?? input.audioUrl,
    imageUrl: input.coverImageUrl,
    mediaKind: input.coverImageUrl ? "image" : "video",
    durationSeconds: duration,
    source: "upload",
    workflow: "voice_message",
    publishIntent: input.entryMode ?? "voice_message",
    metadata: {
      publishEntryMode: input.entryMode ?? "voice_message",
      audioUrl: input.audioUrl,
      voiceMessage: input.message,
      publishTimeline: { ...timeline, projectId: "pending", durationSeconds: duration },
      renderMode: "voice_message",
      voiceInputMode: input.voiceInputMode,
    },
  });

  return {
    ...project,
    metadata: {
      ...project.metadata,
      publishTimeline: { ...timeline, projectId: project.id },
    },
  };
}

export function createAudioWithImageProject(input: {
  name: string;
  audioUrl: string;
  imageUrl: string;
  message?: string;
  durationSeconds?: number;
  entryMode?: PublishEntryMode;
}): PublishProject {
  const duration = input.durationSeconds ?? 45;
  let timeline = createPublishTimeline("pending", duration);
  timeline.items.push({
    id: "visual_base",
    kind: "photo_base",
    label: "Visual",
    startTime: 0,
    endTime: duration,
    track: 0,
    imageUrl: input.imageUrl,
  });
  timeline = addTimelineVoiceItem(timeline, {
    script: input.message ?? "Audio story",
    startTime: 0,
  });
  timeline = addTimelineMusicItem(timeline, {
    mood: "ambient",
    startTime: 0,
    endTime: duration,
  });

  const project = createPublishProject({
    name: input.name,
    videoUrl: input.imageUrl,
    imageUrl: input.imageUrl,
    mediaKind: "image",
    durationSeconds: duration,
    source: "upload",
    workflow: "audio_with_image",
    publishIntent: input.entryMode ?? "audio_with_image",
    metadata: {
      publishEntryMode: input.entryMode ?? "audio_with_image",
      audioUrl: input.audioUrl,
      photoStoryMessage: input.message,
      publishTimeline: { ...timeline, projectId: "pending", durationSeconds: duration },
      renderMode: "audio_with_image",
    },
  });

  return {
    ...project,
    metadata: {
      ...project.metadata,
      publishTimeline: { ...timeline, projectId: project.id },
    },
  };
}

export function isVoiceMessageProject(project: PublishProject): boolean {
  return project.workflow === "voice_message" || project.metadata?.renderMode === "voice_message";
}

export function isAudioWithImageProject(project: PublishProject): boolean {
  return project.workflow === "audio_with_image" || project.metadata?.renderMode === "audio_with_image";
}

export function readPublishAudioUrl(project: PublishProject): string | undefined {
  return typeof project.metadata?.audioUrl === "string" ? project.metadata.audioUrl : undefined;
}
