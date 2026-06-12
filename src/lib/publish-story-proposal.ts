import type { PublishSafeZoneId } from "@/lib/publish-safe-zone-v2";
import type { PublishProject } from "@/types/publish-overlay";
import { resolveSafeZonesForOrientation, scoreSafeZones, pickBestSafeZone } from "@/lib/publish-safe-zone-v2";

export type PublishStorySceneBlock = {
  id: string;
  index: number;
  title: string;
  overlayText: string;
  voiceLine: string;
  startTime: number;
  endTime: number;
  zoneId: PublishSafeZoneId;
  visualIntent: string;
};

export type PhotoStoryDurationChoice = 10 | 20 | 30 | 60;

const PHOTO_STORY_ZONES: PublishSafeZoneId[] = [
  "top_left",
  "middle_upper_left",
  "middle_upper_left",
  "bottom_left",
  "bottom_right",
  "middle_lower_right",
];

export function buildPhotoStorySceneBlocks(input: {
  message: string;
  durationSeconds: PhotoStoryDurationChoice;
  projectName?: string;
}): PublishStorySceneBlock[] {
  const sentences = input.message
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks =
    sentences.length >= 4
      ? sentences.slice(0, 6)
      : splitMessageIntoChunks(input.message, 6);

  const sceneCount = Math.min(6, Math.max(4, chunks.length));
  const slice = chunks.slice(0, sceneCount);
  const slot = input.durationSeconds / sceneCount;
  const occupied: PublishSafeZoneId[] = [];

  return slice.map((text, index) => {
    const heatmap = scoreSafeZones({ orientation: "portrait", occupiedZones: occupied });
    const best = pickBestSafeZone(heatmap);
    const zone = PHOTO_STORY_ZONES[index % PHOTO_STORY_ZONES.length] ?? best.zone;
    occupied.push(zone);
    const start = index * slot;
    const end = start + slot;
    return {
      id: `scene_${index + 1}`,
      index: index + 1,
      title: index === 0 ? "Welcome" : index === sceneCount - 1 ? "Call to action" : `Scene ${index + 1}`,
      overlayText: text,
      voiceLine: text,
      startTime: start,
      endTime: end,
      zoneId: zone,
      visualIntent:
        index === 0 ? "Hook with gentle zoom in"
        : index === sceneCount - 1 ? "Hold on CTA with subtle pan"
        : "Ken Burns pan across image",
    };
  });
}

function splitMessageIntoChunks(message: string, count: number): string[] {
  const words = message.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return Array.from({ length: count }, (_, i) => `Scene ${i + 1}`);
  const per = Math.max(1, Math.ceil(words.length / count));
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(words.slice(i * per, (i + 1) * per).join(" ") || `Part ${i + 1}`);
  }
  return out;
}

export function buildSlideshowSceneBlocks(input: {
  imageCount: number;
  durationSeconds: number;
  message?: string;
}): PublishStorySceneBlock[] {
  const slot = input.durationSeconds / input.imageCount;
  const zones = resolveSafeZonesForOrientation("portrait");
  return Array.from({ length: input.imageCount }, (_, index) => ({
    id: `slide_scene_${index + 1}`,
    index: index + 1,
    title: `Slide ${index + 1}`,
    overlayText: index === 0 && input.message ? input.message.split(".")[0] ?? "" : "",
    voiceLine: index === 0 && input.message ? input.message : "",
    startTime: index * slot,
    endTime: (index + 1) * slot,
    zoneId: zones[index % zones.length] ?? "middle_upper_left",
    visualIntent: "Crossfade transition with light motion",
  }));
}

export function isPhotoStoryDuration(value: number): value is PhotoStoryDurationChoice {
  return value === 10 || value === 20 || value === 30 || value === 60;
}

export function readPhotoStoryMessage(project: PublishProject): string {
  return String(project.metadata?.photoStoryMessage ?? project.publishIntent ?? "");
}
