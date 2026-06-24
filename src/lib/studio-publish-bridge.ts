/**
 * Bridge Studio subtitle tracks → Publish project timeline.
 */

import type { PublishProject, PublishSubtitleSegment } from "@/types/publish-overlay";
import type { SubtitleTrackEntry } from "@/types/studio-voice-execution";

export function mapStudioSubtitleEntriesToPublish(
  entries: SubtitleTrackEntry[],
  options?: { language?: string }
): PublishSubtitleSegment[] {
  return entries.map((entry, index) => ({
    id: `studio-sub-${index}-${Math.round(entry.start * 1000)}`,
    text: entry.text,
    startTime: entry.start,
    endTime: entry.end,
    x: 0.5,
    y: 0.85,
    language: options?.language ?? "en",
    safeAreaStatus: "ok",
  }));
}

export function hydratePublishSubtitlesFromStudioTrack(
  project: PublishProject,
  entries: SubtitleTrackEntry[],
  language = "en"
): PublishProject {
  if (entries.length === 0) {
    return project;
  }
  return {
    ...project,
    subtitles: mapStudioSubtitleEntriesToPublish(entries, { language }),
    updatedAt: new Date().toISOString(),
  };
}

export async function loadStudioSubtitleEntriesForStoryboard(
  storyboardId: string
): Promise<SubtitleTrackEntry[]> {
  const res = await fetch(
    `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/subtitles`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as {
    tracks?: Array<{ entries?: SubtitleTrackEntry[] }>;
    entries?: SubtitleTrackEntry[];
  };
  if (Array.isArray(data.entries)) {
    return data.entries;
  }
  const primary = data.tracks?.[0];
  return primary?.entries ?? [];
}

export async function hydratePublishFromHcProjectWithStudioSubtitles(params: {
  publishProject: PublishProject;
  storyboardId?: string;
  language?: string;
}): Promise<PublishProject> {
  if (!params.storyboardId) {
    return params.publishProject;
  }
  const entries = await loadStudioSubtitleEntriesForStoryboard(params.storyboardId);
  return hydratePublishSubtitlesFromStudioTrack(
    params.publishProject,
    entries,
    params.language
  );
}
