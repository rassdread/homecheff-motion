export const PUBLISH_OVERLAY_TYPES = [
  "title",
  "subtitle",
  "logo",
  "cta",
  "lower_third",
  "text",
] as const;

export type PublishOverlayType = (typeof PUBLISH_OVERLAY_TYPES)[number];

export type PublishOverlayStyle = {
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  fontWeight?: string;
  textAlign?: "left" | "center" | "right";
};

export type PublishOverlaySafeAreaStatus = "ok" | "warning" | "fail";

export type PublishOverlay = {
  id: string;
  type: PublishOverlayType;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  startTime: number;
  endTime: number;
  zIndex: number;
  style: PublishOverlayStyle;
  safeAreaStatus: PublishOverlaySafeAreaStatus;
  language: string;
  locked: boolean;
};

export type PublishProject = {
  id: string;
  name: string;
  videoUrl: string;
  videoStorageKey?: string;
  durationSeconds: number;
  platform: import("@/types/homecheff-presentation-suite").PresentationPlatformPreset;
  overlays: PublishOverlay[];
  subtitles: PublishSubtitleSegment[];
  status: "draft" | "ready" | "exported";
  source: "upload" | "motion" | "standalone";
  motionProjectId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PublishSubtitleSegment = {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  x: number;
  y: number;
  language: string;
  safeAreaStatus: PublishOverlaySafeAreaStatus;
};
