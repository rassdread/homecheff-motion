import type { PublishSafeZoneId } from "@/lib/publish-safe-zone-v2";
import type { PublishTextStylePreset } from "@/lib/publish-text-styling";

export type PublishTimelineItemKind =
  | "text"
  | "title"
  | "cta"
  | "subtitle"
  | "voice"
  | "music"
  | "branding"
  | "slide"
  | "photo_base";

export type PublishTimelineItem = {
  id: string;
  kind: PublishTimelineItemKind;
  label: string;
  startTime: number;
  endTime: number;
  track: number;
  text?: string;
  locked?: boolean;
  safeZoneId?: PublishSafeZoneId;
  style?: PublishTextStylePreset;
  animation?: string;
  voiceId?: string;
  musicMood?: string;
  volume?: number;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
};

export type PublishTimeline = {
  projectId: string;
  items: PublishTimelineItem[];
  durationSeconds: number;
  pendingRender: boolean;
  updatedAt: string;
};
