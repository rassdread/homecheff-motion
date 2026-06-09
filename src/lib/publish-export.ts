import type { LockedTextLayer } from "@/lib/locked-text-layer";
import type { PublishOverlay, PublishProject, PublishSubtitleSegment } from "@/types/publish-overlay";

export function publishOverlayToLockedLayer(overlay: PublishOverlay, videoDurationSec: number): LockedTextLayer {
  const startMs = Math.round(overlay.startTime * 1000);
  const endMs = Math.round(Math.min(videoDurationSec, overlay.endTime) * 1000);
  return {
    id: overlay.id,
    text: overlay.text,
    language: overlay.language === "en" ? "en" : overlay.language === "nl" ? "nl" : "auto",
    x: overlay.x,
    y: overlay.y,
    width: overlay.width,
    height: overlay.height,
    fontSize: overlay.style.fontSize ?? 24,
    color: overlay.style.color ?? "#FFFFFF",
    backgroundColor: overlay.style.backgroundColor,
    textAlign: overlay.style.textAlign ?? "center",
    animation: "none",
    startMs,
    durationMs: Math.max(500, endMs - startMs),
    endMs,
    locked: true,
  };
}

export function publishProjectToLockedLayers(project: PublishProject): LockedTextLayer[] {
  const overlayLayers = project.overlays.map((o) => publishOverlayToLockedLayer(o, project.durationSeconds));
  const subtitleLayers: LockedTextLayer[] = project.subtitles.map((s) => subtitleToLockedLayer(s, project.durationSeconds));
  return [...overlayLayers, ...subtitleLayers];
}

function subtitleToLockedLayer(segment: PublishSubtitleSegment, videoDurationSec: number): LockedTextLayer {
  const startMs = Math.round(segment.startTime * 1000);
  const endMs = Math.round(Math.min(videoDurationSec, segment.endTime) * 1000);
  return {
    id: segment.id,
    text: segment.text,
    language: segment.language === "en" ? "en" : segment.language === "nl" ? "nl" : "auto",
    x: segment.x,
    y: segment.y,
    width: 0.8,
    height: 0.1,
    fontSize: 22,
    color: "#FFFFFF",
    backgroundColor: "rgba(0,0,0,0.55)",
    textAlign: "center",
    animation: "none",
    startMs,
    durationMs: Math.max(500, endMs - startMs),
    endMs,
    locked: true,
  };
}
