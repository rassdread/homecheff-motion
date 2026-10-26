/**
 * Places existing project media on the film timeline and can reverse
 * the picture order. It does not generate media or charge HC.
 */

import { reverseStoryClipStarts } from "@/lib/studio-film-reverse-story";
import {
  addTimelineClip,
  createFilmTimeline,
  getFilmTimeline,
  updateTimelineClip,
} from "@/server/studio/studio-timeline-service";

type Failure = { error: { code: string; message: string; httpStatus: number } };

export async function applyReverseStoryOrder(ownerId: string, projectId: string): Promise<Awaited<ReturnType<typeof getFilmTimeline>> | Failure> {
  const current = await getFilmTimeline(ownerId, projectId);
  if ("error" in current) return current;
  if (!current.timeline) return { error: { code: "not_found", message: "Create the timeline first.", httpStatus: 404 } };
  const video = current.timeline.tracks.find((track) => track.type === "VIDEO");
  if (!video || video.clips.length < 2) return current;
  const ordered = [...video.clips].sort((left, right) => left.startMs - right.startMs || left.id.localeCompare(right.id));
  const next = reverseStoryClipStarts(ordered.map((clip) => ({ id: clip.id, durationMs: clip.durationMs })));
  let revision = current.timeline.revision;
  for (const clip of next) {
    const updated = await updateTimelineClip({
      ownerId,
      projectId,
      revision,
      clipId: clip.id,
      patch: { startMs: clip.startMs },
    });
    if ("error" in updated || !updated.timeline) return updated;
    revision = updated.timeline.revision;
  }
  return getFilmTimeline(ownerId, projectId);
}

export async function placeProjectMediaOnTimeline(input: {
  ownerId: string;
  projectId: string;
  videoAssetIdsInStoryOrder: string[];
  dialogueAssetIdsInStoryOrder: string[];
  musicAssetId?: string | null;
}): Promise<Awaited<ReturnType<typeof getFilmTimeline>> | Failure> {
  const created = await createFilmTimeline(input.ownerId, input.projectId);
  if ("error" in created || !created.timeline) return created;
  let revision = created.timeline.revision;
  const videoTrack = created.timeline.tracks.find((track) => track.type === "VIDEO");
  const dialogueTrack = created.timeline.tracks.find((track) => track.type === "DIALOGUE");
  const musicTrack = created.timeline.tracks.find((track) => track.type === "MUSIC");
  if (!videoTrack || !dialogueTrack || !musicTrack) {
    return { error: { code: "track_type", message: "The timeline is missing a track.", httpStatus: 500 } };
  }

  let cursor = 0;
  for (const [index, assetId] of input.videoAssetIdsInStoryOrder.entries()) {
    const added = await addTimelineClip({
      ownerId: input.ownerId,
      projectId: input.projectId,
      revision,
      trackId: videoTrack.id,
      sourceKind: "library_asset",
      sourceId: assetId,
      startMs: cursor,
      clientRequestId: `video-${index}-${assetId}`,
    });
    if ("error" in added || !added.timeline) return added;
    const clip = added.timeline.tracks
      .find((track) => track.id === videoTrack.id)
      ?.clips.find((item) => item.sourceId === assetId);
    cursor += clip?.durationMs ?? 1000;
    revision = added.timeline.revision;
  }
  cursor = 0;
  for (const [index, assetId] of input.dialogueAssetIdsInStoryOrder.entries()) {
    const added = await addTimelineClip({
      ownerId: input.ownerId,
      projectId: input.projectId,
      revision,
      trackId: dialogueTrack.id,
      sourceKind: "library_asset",
      sourceId: assetId,
      startMs: cursor,
      clientRequestId: `dialogue-${index}-${assetId}`,
    });
    if ("error" in added || !added.timeline) return added;
    const clip = added.timeline.tracks
      .find((track) => track.id === dialogueTrack.id)
      ?.clips.find((item) => item.sourceId === assetId);
    cursor += clip?.durationMs ?? 1000;
    revision = added.timeline.revision;
  }
  if (input.musicAssetId) {
    const added = await addTimelineClip({
      ownerId: input.ownerId,
      projectId: input.projectId,
      revision,
      trackId: musicTrack.id,
      sourceKind: "library_asset",
      sourceId: input.musicAssetId,
      startMs: 0,
      clientRequestId: `music-${input.musicAssetId}`,
    });
    if ("error" in added || !added.timeline) return added;
  }
  return getFilmTimeline(input.ownerId, input.projectId);
}
