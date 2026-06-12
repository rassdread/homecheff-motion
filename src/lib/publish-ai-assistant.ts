import type { PublishSafeZoneId } from "@/lib/publish-safe-zone-v2";
import type { PublishProject } from "@/types/publish-overlay";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import { collectBriefFromHcProject } from "@/lib/hc-workflow-v2";
import {
  buildPhotoStorySceneBlocks,
  buildSlideshowSceneBlocks,
  isPhotoStoryDuration,
  readPhotoStoryMessage,
  type PublishStorySceneBlock,
} from "@/lib/publish-story-proposal";
import { isPhotoStoryProject, isSlideshowProject } from "@/lib/publish-photo-story";
import { isAudioWithImageProject, isVoiceMessageProject, readPublishAudioUrl } from "@/lib/publish-audio-workflows";

export type PublishAiProposal = {
  title: string;
  scenes: PublishStorySceneBlock[];
  overlayTexts: Array<{ id: string; text: string; type: "title" | "cta" | "text"; zoneHint?: PublishSafeZoneId }>;
  subtitles: Array<{ id: string; text: string; startTime: number; endTime: number }>;
  voiceOverScript: string;
  musicDirection: string;
  brandingNotes: string;
  socialCaptions: string[];
  cta: string;
};

export function buildPublishAiProposal(input: {
  project: PublishProject;
  hcProject?: HomeCheffProjectPackage | null;
}): PublishAiProposal {
  const brief = input.hcProject ? collectBriefFromHcProject(input.hcProject) : {};
  const name = input.project.name || "Untitled";
  const isVideo = (input.project.mediaKind ?? "video") === "video";
  const intent = input.project.publishIntent ?? (brief.publishIntent as string) ?? "social_post";
  const duration = input.project.durationSeconds || 10;

  let scenes: PublishStorySceneBlock[] = [];

  if (isPhotoStoryProject(input.project)) {
    const message = readPhotoStoryMessage(input.project) || name;
    const dur = isPhotoStoryDuration(duration) ? duration : 30;
    scenes = buildPhotoStorySceneBlocks({ message, durationSeconds: dur, projectName: name });
  } else if (isSlideshowProject(input.project)) {
    const count = input.project.imageUrls?.length ?? 2;
    scenes = buildSlideshowSceneBlocks({
      imageCount: count,
      durationSeconds: duration,
      message: readPhotoStoryMessage(input.project),
    });
  } else if (isVoiceMessageProject(input.project) || isAudioWithImageProject(input.project)) {
    const message = readPhotoStoryMessage(input.project) || name;
    const dur = isPhotoStoryDuration(duration) ? duration : 30;
    scenes = buildPhotoStorySceneBlocks({ message, durationSeconds: dur, projectName: name }).map((s) => ({
      ...s,
      visualIntent: isVoiceMessageProject(input.project) ? "Voice waveform visual with cover art" : "Image holds while audio plays",
      voiceLine: s.voiceLine || message,
    }));
    if (readPublishAudioUrl(input.project)) {
      scenes[0] = { ...scenes[0]!, title: "Voice", visualIntent: "Synced to uploaded audio" };
    }
  } else if (isVideo) {
    const slot = duration / 4;
    scenes = [
      { id: "scene_1", index: 1, title: "Hook", overlayText: name, voiceLine: `Introducing ${name}.`, startTime: 0, endTime: slot, zoneId: "top_left", visualIntent: "Open on product" },
      { id: "scene_2", index: 2, title: "Story", overlayText: "Discover more", voiceLine: "Here is what makes it special.", startTime: slot, endTime: slot * 2, zoneId: "middle_upper_left", visualIntent: "Mid-roll emphasis" },
      { id: "scene_3", index: 3, title: "Proof", overlayText: "Trusted quality", voiceLine: "Built for your audience.", startTime: slot * 2, endTime: slot * 3, zoneId: "bottom_left", visualIntent: "Social proof beat" },
      { id: "scene_4", index: 4, title: "CTA", overlayText: intent === "social_post" ? "Follow for more" : "Shop now", voiceLine: "Take action today.", startTime: slot * 3, endTime: duration, zoneId: "bottom_right", visualIntent: "Call to action" },
    ];
  }

  const overlayTexts =
    scenes.length > 0
      ? scenes.map((s) => ({
          id: s.id,
          text: s.overlayText,
          type: (s.title.toLowerCase().includes("cta") ? "cta" : s.index === 1 ? "title" : "text") as "title" | "cta" | "text",
          zoneHint: s.zoneId,
        }))
      : [
          { id: "prop_title", text: name, type: "title" as const, zoneHint: "top_left" as PublishSafeZoneId },
          { id: "prop_cta", text: intent === "social_post" ? "Learn more →" : "Shop now", type: "cta" as const, zoneHint: "bottom_right" as PublishSafeZoneId },
        ];

  const subtitles = scenes
    .filter((s) => s.voiceLine.trim())
    .map((s) => ({
      id: `sub_${s.id}`,
      text: s.voiceLine,
      startTime: s.startTime,
      endTime: s.endTime,
    }));

  const voiceOverScript = scenes.map((s) => s.voiceLine).filter(Boolean).join(" ");

  return {
    title: name,
    scenes,
    overlayTexts,
    subtitles,
    voiceOverScript: voiceOverScript || `Discover ${name}.`,
    musicDirection: intent === "social_post" ? "Upbeat, modern, light percussion" : "Warm cinematic bed",
    brandingNotes: "AI placed text in safe zones. Adjust only if needed.",
    socialCaptions: [`${name} — made with HomeCheff Studio ✨`, `New drop: ${name}.`],
    cta: intent === "social_post" ? "Follow for more" : "Get started today",
  };
}

export type PublishAiAcceptance = {
  title: boolean;
  overlays: boolean;
  subtitles: boolean;
  voice: boolean;
  music: boolean;
  branding: boolean;
  captions: boolean;
  cta: boolean;
};

export const DEFAULT_PUBLISH_AI_ACCEPTANCE: PublishAiAcceptance = {
  title: true,
  overlays: true,
  subtitles: true,
  voice: true,
  music: true,
  branding: true,
  captions: true,
  cta: true,
};
