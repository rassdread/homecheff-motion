import { motionPreviewKeyframes } from "@/lib/editor-object-animation";
import type {
  EditorCanvasDocument,
  EditorObjectAnimationProfile,
  EditorQuickMotionConfig,
  EditorQuickMotionFormat,
  EditorQuickMotionPreset,
} from "@/types/homecheff-visual-editor";

export const DEFAULT_QUICK_MOTION_CONFIG: EditorQuickMotionConfig = {
  preset: "float",
  format: "gif",
  durationSec: 2,
  loop: true,
  fps: 12,
  width: 512,
  height: 512,
  transparentBackground: true,
  quality: 0.85,
};

export const QUICK_MOTION_ANIMATION_MAP: Record<EditorQuickMotionPreset, EditorObjectAnimationProfile> = {
  float: "float",
  pulse: "pulse",
  rotate: "rotate",
  bounce: "bounce",
  reveal: "float",
  orbit: "orbit",
  wiggle: "wave",
  logo_pop: "pulse",
  globe_spin: "rotate",
};

export function createQuickMotionConfig(
  overrides?: Partial<EditorQuickMotionConfig>
): EditorQuickMotionConfig {
  return { ...DEFAULT_QUICK_MOTION_CONFIG, ...overrides };
}

export function attachQuickMotionConfig(
  document: EditorCanvasDocument,
  config: Partial<EditorQuickMotionConfig>
): EditorCanvasDocument {
  return {
    ...document,
    workspaceMode: "quick_motion",
    quickMotionConfig: createQuickMotionConfig({
      ...document.quickMotionConfig,
      ...config,
    }),
    updatedAt: new Date().toISOString(),
  };
}

export type QuickMotionFrame = {
  index: number;
  rotation: number;
  scale: number;
  offsetY: number;
  opacity: number;
};

export function buildQuickMotionFrames(config: EditorQuickMotionConfig): QuickMotionFrame[] {
  const totalFrames = Math.max(1, Math.round(config.durationSec * config.fps));
  const profile = QUICK_MOTION_ANIMATION_MAP[config.preset];
  const frames: QuickMotionFrame[] = [];
  for (let i = 0; i < totalFrames; i++) {
    const kf = motionPreviewKeyframes(profile, i, totalFrames);
    frames.push({
      index: i,
      rotation: kf.rotation,
      scale: kf.scale,
      offsetY: kf.offsetY,
      opacity: config.preset === "reveal" ? Math.min(1, (i + 1) / (totalFrames * 0.4)) : 1,
    });
  }
  return frames;
}

export type QuickMotionExportJob = {
  jobId: string;
  format: EditorQuickMotionFormat;
  frameCount: number;
  width: number;
  height: number;
  loop: boolean;
  transparentBackground: boolean;
  status: "ready" | "pending_server";
  message: string;
  downloadUrl?: string;
};

export function planQuickMotionExport(
  document: EditorCanvasDocument,
  config?: Partial<EditorQuickMotionConfig>
): QuickMotionExportJob {
  const merged = createQuickMotionConfig({ ...document.quickMotionConfig, ...config });
  const frames = buildQuickMotionFrames(merged);
  return {
    jobId: `quick_motion_${document.sessionId}_${Date.now()}`,
    format: merged.format,
    frameCount: frames.length,
    width: merged.width,
    height: merged.height,
    loop: merged.loop,
    transparentBackground: merged.transparentBackground,
    status: "pending_server",
    message: "Quick motion export queued — server encoder will produce the file.",
  };
}

export function quickMotionFormatMime(format: EditorQuickMotionFormat): string {
  switch (format) {
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "mp4":
      return "video/mp4";
  }
}
