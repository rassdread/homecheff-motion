import { resolveSafeAreaSpec } from "@/lib/homecheff-presentation-foundation";
import type { PresentationPlatformPreset } from "@/types/homecheff-presentation-suite";
import type {
  PublishOverlay,
  PublishOverlaySafeAreaStatus,
  PublishOverlayType,
  PublishProject,
  PublishSubtitleSegment,
} from "@/types/publish-overlay";

export function createPublishOverlayId(): string {
  return crypto.randomUUID();
}

export function createDefaultPublishOverlay(type: PublishOverlayType = "text"): PublishOverlay {
  return {
    id: createPublishOverlayId(),
    type,
    text: type === "title" ? "Title" : type === "subtitle" ? "Subtitle" : "Text",
    x: 0.1,
    y: type === "lower_third" ? 0.78 : 0.15,
    width: 0.8,
    height: 0.12,
    startTime: 0,
    endTime: 5,
    zIndex: 1,
    style: { fontSize: type === "title" ? 28 : 20, color: "#ffffff", textAlign: "center" },
    safeAreaStatus: "ok",
    language: "nl",
    locked: false,
  };
}

export function auditOverlaySafeArea(
  overlay: Pick<PublishOverlay, "x" | "y" | "width" | "height">,
  platform: PresentationPlatformPreset
): PublishOverlaySafeAreaStatus {
  const spec = resolveSafeAreaSpec(platform);
  const margin = (100 - spec.actionSafePercent) / 200;
  const left = overlay.x;
  const top = overlay.y;
  const right = overlay.x + overlay.width;
  const bottom = overlay.y + overlay.height;
  if (left < margin || top < margin || right > 1 - margin || bottom > 1 - margin) {
    return "fail";
  }
  const warnMargin = margin * 0.5;
  if (left < margin + warnMargin || top < margin + warnMargin || right > 1 - margin - warnMargin) {
    return "warning";
  }
  return "ok";
}

export function addPublishOverlay(project: PublishProject, type?: PublishOverlayType): PublishProject {
  const overlay = createDefaultPublishOverlay(type);
  overlay.safeAreaStatus = auditOverlaySafeArea(overlay, project.platform);
  overlay.zIndex = project.overlays.length + 1;
  return { ...project, overlays: [...project.overlays, overlay], updatedAt: new Date().toISOString() };
}

export function patchPublishOverlay(
  project: PublishProject,
  overlayId: string,
  patch: Partial<PublishOverlay>
): PublishProject {
  const overlays = project.overlays.map((o) => {
    if (o.id !== overlayId) {
      return o;
    }
    const next = { ...o, ...patch, id: o.id };
    next.safeAreaStatus = auditOverlaySafeArea(next, project.platform);
    return next;
  });
  return { ...project, overlays, updatedAt: new Date().toISOString() };
}

export function removePublishOverlay(project: PublishProject, overlayId: string): PublishProject {
  return {
    ...project,
    overlays: project.overlays.filter((o) => o.id !== overlayId),
    updatedAt: new Date().toISOString(),
  };
}

export function duplicatePublishOverlay(project: PublishProject, overlayId: string): PublishProject {
  const source = project.overlays.find((o) => o.id === overlayId);
  if (!source) {
    return project;
  }
  const copy: PublishOverlay = {
    ...source,
    id: createPublishOverlayId(),
    x: Math.min(0.9, source.x + 0.02),
    y: Math.min(0.9, source.y + 0.02),
    zIndex: project.overlays.length + 1,
  };
  return { ...project, overlays: [...project.overlays, copy], updatedAt: new Date().toISOString() };
}

export function reorderPublishOverlayZIndex(
  project: PublishProject,
  overlayId: string,
  direction: "forward" | "backward"
): PublishProject {
  const sorted = [...project.overlays].sort((a, b) => a.zIndex - b.zIndex);
  const idx = sorted.findIndex((o) => o.id === overlayId);
  if (idx < 0) {
    return project;
  }
  const swapIdx = direction === "forward" ? idx + 1 : idx - 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) {
    return project;
  }
  const a = sorted[idx];
  const b = sorted[swapIdx];
  const aZ = a.zIndex;
  sorted[idx] = { ...a, zIndex: b.zIndex };
  sorted[swapIdx] = { ...b, zIndex: aZ };
  return { ...project, overlays: sorted, updatedAt: new Date().toISOString() };
}

export function createPublishSubtitleSegment(startTime = 0, endTime = 3): PublishSubtitleSegment {
  return {
    id: createPublishOverlayId(),
    text: "",
    startTime,
    endTime,
    x: 0.1,
    y: 0.82,
    language: "nl",
    safeAreaStatus: "ok",
  };
}

export function patchPublishSubtitle(
  project: PublishProject,
  segmentId: string,
  patch: Partial<PublishSubtitleSegment>
): PublishProject {
  const subtitles = project.subtitles.map((s) => {
    if (s.id !== segmentId) {
      return s;
    }
    const next = { ...s, ...patch, id: s.id };
    next.safeAreaStatus = auditOverlaySafeArea(
      { x: next.x, y: next.y, width: 0.8, height: 0.1 },
      project.platform
    );
    return next;
  });
  return { ...project, subtitles, updatedAt: new Date().toISOString() };
}

export function addPublishSubtitle(project: PublishProject): PublishProject {
  const last = project.subtitles[project.subtitles.length - 1];
  const start = last ? last.endTime + 0.1 : 0;
  return {
    ...project,
    subtitles: [...project.subtitles, createPublishSubtitleSegment(start, start + 3)],
    updatedAt: new Date().toISOString(),
  };
}

export function parseSrtContent(content: string): PublishSubtitleSegment[] {
  const blocks = content.trim().split(/\n\s*\n/);
  const segments: PublishSubtitleSegment[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      continue;
    }
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) {
      continue;
    }
    const [startRaw, endRaw] = timeLine.split("-->").map((s) => s.trim());
    const text = lines.slice(lines.indexOf(timeLine) + 1).join("\n");
    segments.push({
      id: createPublishOverlayId(),
      text,
      startTime: parseSrtTime(startRaw),
      endTime: parseSrtTime(endRaw),
      x: 0.1,
      y: 0.82,
      language: "auto",
      safeAreaStatus: "ok",
    });
  }
  return segments;
}

function parseSrtTime(raw: string): number {
  const m = raw.match(/(?:(\d+):)?(\d+):(\d+)[,.](\d+)/);
  if (!m) {
    return 0;
  }
  const h = Number(m[1] ?? 0);
  const min = Number(m[2]);
  const sec = Number(m[3]);
  const ms = Number(m[4].padEnd(3, "0").slice(0, 3));
  return h * 3600 + min * 60 + sec + ms / 1000;
}

export function parseVttContent(content: string): PublishSubtitleSegment[] {
  const body = content.replace(/^WEBVTT[^\n]*\n/i, "").trim();
  return parseSrtContent(body.replace(/\./g, ","));
}

export function publishOverlayDurationWarning(overlay: PublishOverlay): boolean {
  return overlay.endTime - overlay.startTime < 1;
}

export function publishOverlayTextDensityWarning(overlay: PublishOverlay): boolean {
  return overlay.text.length > 120;
}
