import type { PublishOverlay, PublishProject } from "@/types/publish-overlay";
import type { PublishTimeline, PublishTimelineItem, PublishTimelineItemKind } from "@/types/publish-timeline";
import { DEFAULT_PUBLISH_TEXT_STYLE } from "@/lib/publish-text-styling";
import { addPublishOverlay, createPublishOverlayId, patchPublishOverlay } from "@/lib/publish-overlay-timeline";

export function createPublishTimeline(projectId: string, durationSeconds: number): PublishTimeline {
  return {
    projectId,
    items: [],
    durationSeconds,
    pendingRender: false,
    updatedAt: new Date().toISOString(),
  };
}

export function loadPublishTimelineFromProject(project: PublishProject): PublishTimeline {
  const raw = project.metadata?.publishTimeline;
  if (raw && typeof raw === "object") return raw as PublishTimeline;
  return syncTimelineFromProject(project);
}

export function savePublishTimelineToProject(project: PublishProject, timeline: PublishTimeline): PublishProject {
  return {
    ...project,
    metadata: { ...project.metadata, publishTimeline: timeline },
    updatedAt: new Date().toISOString(),
  };
}

export function syncTimelineFromProject(project: PublishProject): PublishTimeline {
  const items: PublishTimelineItem[] = [];

  for (const overlay of project.overlays) {
    items.push(overlayToTimelineItem(overlay));
  }

  for (const sub of project.subtitles) {
    items.push({
      id: sub.id,
      kind: "subtitle",
      label: sub.text.slice(0, 24) || "Subtitle",
      startTime: sub.startTime,
      endTime: sub.endTime,
      track: 2,
      text: sub.text,
    });
  }

  if (project.mediaKind === "image" && project.imageUrl) {
    items.unshift({
      id: "photo_base",
      kind: "photo_base",
      label: "Photo",
      startTime: 0,
      endTime: project.durationSeconds,
      track: 0,
      imageUrl: project.imageUrl,
    });
  }

  if (project.mediaKind === "carousel" && project.imageUrls?.length) {
    let t = 0;
    const slideDur = project.durationSeconds / project.imageUrls.length;
    for (const [i, url] of project.imageUrls.entries()) {
      items.push({
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
  }

  return {
    projectId: project.id,
    items,
    durationSeconds: project.durationSeconds,
    pendingRender: false,
    updatedAt: new Date().toISOString(),
  };
}

function overlayToTimelineItem(overlay: PublishOverlay): PublishTimelineItem {
  const kind: PublishTimelineItemKind =
    overlay.type === "title" ? "title"
    : overlay.type === "cta" ? "cta"
    : overlay.type === "subtitle" ? "subtitle"
    : "text";

  return {
    id: overlay.id,
    kind,
    label: overlay.text.slice(0, 24) || kind,
    startTime: overlay.startTime,
    endTime: overlay.endTime,
    track: kind === "subtitle" ? 2 : 1,
    text: overlay.text,
    locked: overlay.locked,
    style: DEFAULT_PUBLISH_TEXT_STYLE,
  };
}

export function addTimelineTextItem(
  timeline: PublishTimeline,
  input: {
    text: string;
    kind?: PublishTimelineItemKind;
    startTime?: number;
    endTime?: number;
    playhead?: number;
    fullDuration?: boolean;
  }
): PublishTimeline {
  const start =
    input.startTime ??
    (input.fullDuration ? 0 : (input.playhead ?? 0));
  const end =
    input.endTime ??
    (input.fullDuration ? timeline.durationSeconds : Math.min(timeline.durationSeconds, start + 3));

  const item: PublishTimelineItem = {
    id: createPublishOverlayId(),
    kind: input.kind ?? "text",
    label: input.text.slice(0, 24) || "Text",
    startTime: start,
    endTime: end,
    track: 1,
    text: input.text,
    style: DEFAULT_PUBLISH_TEXT_STYLE,
  };

  return {
    ...timeline,
    items: [...timeline.items, item],
    pendingRender: true,
    updatedAt: new Date().toISOString(),
  };
}

export function patchTimelineItem(
  timeline: PublishTimeline,
  itemId: string,
  patch: Partial<PublishTimelineItem>
): PublishTimeline {
  return {
    ...timeline,
    items: timeline.items.map((item) => (item.id === itemId ? { ...item, ...patch, id: item.id } : item)),
    pendingRender: true,
    updatedAt: new Date().toISOString(),
  };
}

export function deleteTimelineItem(timeline: PublishTimeline, itemId: string): PublishTimeline {
  return {
    ...timeline,
    items: timeline.items.filter((item) => item.id !== itemId),
    pendingRender: true,
    updatedAt: new Date().toISOString(),
  };
}

export function duplicateTimelineItem(timeline: PublishTimeline, itemId: string): PublishTimeline {
  const source = timeline.items.find((item) => item.id === itemId);
  if (!source) return timeline;
  const duration = source.endTime - source.startTime;
  const offset = Math.min(timeline.durationSeconds - duration, source.endTime + 0.1);
  const copy: PublishTimelineItem = {
    ...source,
    id: createPublishOverlayId(),
    label: `${source.label} (copy)`,
    startTime: offset,
    endTime: Math.min(timeline.durationSeconds, offset + duration),
    locked: false,
  };
  return {
    ...timeline,
    items: [...timeline.items, copy],
    pendingRender: true,
    updatedAt: new Date().toISOString(),
  };
}

export function setTimelineItemDuration(
  timeline: PublishTimeline,
  itemId: string,
  durationSeconds: number
): PublishTimeline {
  const item = timeline.items.find((i) => i.id === itemId);
  if (!item) return timeline;
  const end = Math.min(timeline.durationSeconds, item.startTime + Math.max(0.1, durationSeconds));
  return patchTimelineItem(timeline, itemId, { endTime: end });
}

export function toggleTimelineItemLock(timeline: PublishTimeline, itemId: string): PublishTimeline {
  const item = timeline.items.find((i) => i.id === itemId);
  if (!item) return timeline;
  return patchTimelineItem(timeline, itemId, { locked: !item.locked });
}

export function addTimelineVoiceItem(
  timeline: PublishTimeline,
  input: { script: string; startTime?: number; voiceId?: string }
): PublishTimeline {
  const start = input.startTime ?? 0;
  const estDuration = Math.max(2, Math.ceil(input.script.split(/\s+/).length / 2.5));
  const item: PublishTimelineItem = {
    id: createPublishOverlayId(),
    kind: "voice",
    label: "Voice",
    startTime: start,
    endTime: Math.min(timeline.durationSeconds, start + estDuration),
    track: 3,
    text: input.script,
    voiceId: input.voiceId,
  };
  return { ...timeline, items: [...timeline.items, item], pendingRender: true, updatedAt: new Date().toISOString() };
}

export function addTimelineMusicItem(
  timeline: PublishTimeline,
  input: { mood: string; startTime?: number; endTime?: number }
): PublishTimeline {
  const start = input.startTime ?? 0;
  const end = input.endTime ?? timeline.durationSeconds;
  const item: PublishTimelineItem = {
    id: createPublishOverlayId(),
    kind: "music",
    label: input.mood,
    startTime: start,
    endTime: end,
    track: 4,
    musicMood: input.mood,
    volume: 0.8,
  };
  return { ...timeline, items: [...timeline.items, item], pendingRender: true, updatedAt: new Date().toISOString() };
}

export function addTimelineBrandingItem(
  timeline: PublishTimeline,
  input: { label: string; startTime?: number; endTime?: number; safeZoneId?: string }
): PublishTimeline {
  const start = input.startTime ?? 0;
  const end = input.endTime ?? timeline.durationSeconds;
  const item: PublishTimelineItem = {
    id: createPublishOverlayId(),
    kind: "branding",
    label: input.label,
    startTime: start,
    endTime: end,
    track: 5,
    metadata: { safeZoneId: input.safeZoneId },
  };
  return { ...timeline, items: [...timeline.items, item], pendingRender: true, updatedAt: new Date().toISOString() };
}

export function timelineHasPendingRender(timeline: PublishTimeline): boolean {
  return timeline.pendingRender && timeline.items.length > 0;
}

/** Apply timeline text/voice/music/branding to project metadata before final export — no mid-edit render. */
export function applyTimelineToPublishProject(project: PublishProject): PublishProject {
  const timeline = loadPublishTimelineFromProject(project);
  let next = { ...project };

  const voiceScript = timeline.items.find((i) => i.kind === "voice")?.text;
  const musicMood = timeline.items.find((i) => i.kind === "music")?.musicMood;
  const branding = timeline.items.find((i) => i.kind === "branding")?.label;

  if (voiceScript) {
    next = { ...next, metadata: { ...next.metadata, voiceScript } };
  }
  if (musicMood) {
    next = { ...next, metadata: { ...next.metadata, musicDirection: musicMood } };
  }
  if (branding) {
    next = { ...next, metadata: { ...next.metadata, brandingNotes: branding } };
  }

  for (const item of timeline.items) {
    if (item.kind !== "text" && item.kind !== "title" && item.kind !== "cta") continue;
    if (!item.text?.trim()) continue;
    const existing = next.overlays.find((o) => o.id === item.id);
    if (existing) {
      next = patchPublishOverlay(next, item.id, {
        text: item.text,
        startTime: item.startTime,
        endTime: item.endTime,
        locked: item.locked,
      });
    } else {
      next = addPublishOverlay(next, item.kind === "cta" ? "cta" : item.kind === "title" ? "title" : "text");
      const added = next.overlays[next.overlays.length - 1];
      if (added) {
        next = patchPublishOverlay(next, added.id, {
          text: item.text,
          startTime: item.startTime,
          endTime: item.endTime,
          locked: item.locked,
        });
      }
    }
  }

  const clearedTimeline = { ...timeline, pendingRender: false, updatedAt: new Date().toISOString() };
  return savePublishTimelineToProject(next, clearedTimeline);
}
