/**
 * Persistent film timeline. Writes timeline rows and, when a storyboard
 * already exists, the existing subtitle track for that language.
 * Does not generate media, reserve credits, or create a storyboard.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getCreativeProjectForOwner } from "@/server/studio-library/creative-project-service";
import { listUserAudioLibraryAssets } from "@/server/studio/studio-user-audio-library-blob";
import { isOwnedProductionBlobUrl } from "@/lib/studio-film-media";
import { narrationClipCarriesProjectAudio, ownedNarrationAudioUrl, ownedVoiceStorageKey } from "@/lib/studio-narration-playback";
import { resolvePublicBlobUrlByPathname } from "@/lib/vercel-blob-config";
import { certifiedLocalMediaId, ownedCertifiedLocalPath } from "@/lib/studio-local-media";
import {
  applyClipPatch,
  audibleClip,
  authoritativeSubtitleCues,
  buildSrt,
  buildVtt,
  cuesToStored,
  defaultTimelineTracks,
  existingSourceIds,
  filmEndMs,
  isTimelineTrackType,
  nextSubtitleOrder,
  normalizeLanguageTag,
  presentDialogue,
  presentNarration,
  sameRevision,
  subtitleFilename,
  tracksAreCompatible,
  validateCue,
  type ClipShape,
  type TimelineCue,
  type TimelineTrackType,
} from "@/lib/studio-timeline";

type ServiceError = { code: string; message: string; httpStatus: number };
type Failure = { error: ServiceError };

function fail(code: string, message: string, httpStatus: number): Failure {
  return { error: { code, message, httpStatus } };
}

const trackInclude = {
  clips: { orderBy: { startMs: "asc" as const } },
} as const;

async function ownedProject(ownerId: string, projectId: string) {
  const project = await getCreativeProjectForOwner(projectId, ownerId);
  if (!project) return fail("not_found", "Film not found.", 404);
  return { project };
}

async function loadTimeline(projectId: string) {
  return prisma.studioTimeline.findUnique({
    where: { projectId },
    include: { tracks: { orderBy: { sortOrder: "asc" }, include: trackInclude } },
  });
}

async function bump(timelineId: string, revision: number) {
  const updated = await prisma.studioTimeline.updateMany({
    where: { id: timelineId, revision },
    data: { revision: { increment: 1 } },
  });
  return updated.count === 1;
}

export async function getFilmTimeline(ownerId: string, projectId: string) {
  const owned = await ownedProject(ownerId, projectId);
  if ("error" in owned) return owned;
  const timeline = await loadTimeline(projectId);
  if (!timeline) return { timeline: null, projectId };
  return { timeline: await present(ownerId, owned.project, timeline) };
}

export async function createFilmTimeline(ownerId: string, projectId: string) {
  const owned = await ownedProject(ownerId, projectId);
  if ("error" in owned) return owned;
  const existing = await loadTimeline(projectId);
  if (existing) return { timeline: await present(ownerId, owned.project, existing), created: false };
  await prisma.studioTimeline.create({
    data: {
      projectId,
      revision: 1,
      tracks: { create: defaultTimelineTracks() },
    },
  });
  const timeline = await loadTimeline(projectId);
  return { timeline: await present(ownerId, owned.project, timeline!), created: true };
}

export async function setTimelineTrack(input: {
  ownerId: string;
  projectId: string;
  revision: number;
  trackId: string;
  muted?: boolean;
  volume?: number;
}) {
  const ready = await readyTimeline(input.ownerId, input.projectId, input.revision);
  if ("error" in ready) return ready;
  const track = ready.timeline.tracks.find((item) => item.id === input.trackId);
  if (!track) return fail("not_found", "Track not found.", 404);
  if (input.volume != null && (input.volume < 0 || input.volume > 100 || !Number.isInteger(input.volume))) {
    return fail("volume", "Volume must be a whole number from 0 to 100.", 400);
  }
  if (!(await bump(ready.timeline.id, input.revision))) return fail("conflict", "The timeline changed. Reload it.", 409);
  await prisma.studioTimelineTrack.update({
    where: { id: track.id },
    data: {
      ...(input.muted != null ? { muted: input.muted } : {}),
      ...(input.volume != null ? { volume: input.volume } : {}),
    },
  });
  return getFilmTimeline(input.ownerId, input.projectId);
}

export async function setTimelineMode(ownerId: string, projectId: string, revision: number, simpleMode: boolean) {
  const ready = await readyTimeline(ownerId, projectId, revision);
  if ("error" in ready) return ready;
  if (!(await bump(ready.timeline.id, revision))) return fail("conflict", "The timeline changed. Reload it.", 409);
  await prisma.studioTimeline.update({ where: { id: ready.timeline.id }, data: { simpleMode } });
  return getFilmTimeline(ownerId, projectId);
}

export async function addTimelineClip(input: {
  ownerId: string;
  projectId: string;
  revision: number;
  trackId: string;
  sourceKind: string;
  sourceId: string;
  startMs: number;
  durationMs?: number;
  clientRequestId?: string;
  confirmDuplicate?: boolean;
}) {
  const ready = await readyTimeline(input.ownerId, input.projectId, input.revision);
  if ("error" in ready) return ready;
  const track = ready.timeline.tracks.find((item) => item.id === input.trackId);
  if (!track || !isTimelineTrackType(track.type) || track.type === "SUBTITLE") {
    return fail("track_type", "Choose a video, dialogue, narration, music, or sound-effects track.", 400);
  }
  const requestId = input.clientRequestId?.trim() ?? "";
  if (requestId) {
    const prior = track.clips.find((clip) => clip.clientRequestId === requestId);
    if (prior) return getFilmTimeline(input.ownerId, input.projectId);
  }
  const source = await resolveSource({
    ownerId: input.ownerId,
    project: ready.project,
    trackType: track.type,
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
  });
  if ("error" in source) return source;
  if (!input.confirmDuplicate && existingSourceIds(track.clips.map((clip) => clip.sourceId), input.sourceId)) {
    return fail("confirmation_required", "This item is already on the track.", 409);
  }
  const shape = applyClipPatch(
    { startMs: 0, durationMs: source.durationMs, inMs: 0, outMs: null, volume: 100, muted: false, text: "" },
    { startMs: input.startMs, durationMs: input.durationMs ?? source.durationMs },
  );
  if (!shape.ok) return fail(shape.code, "The clip timing is not valid.", 400);
  if (!(await bump(ready.timeline.id, input.revision))) return fail("conflict", "The timeline changed. Reload it.", 409);
  await prisma.studioTimelineClip.create({
    data: {
      trackId: track.id,
      ...shape.value,
      sourceKind: input.sourceKind,
      sourceId: input.sourceId,
      clientRequestId: requestId,
    },
  });
  return getFilmTimeline(input.ownerId, input.projectId);
}

export async function updateTimelineClip(input: {
  ownerId: string;
  projectId: string;
  revision: number;
  clipId: string;
  trackId?: string;
  patch: Partial<ClipShape>;
}) {
  const ready = await readyTimeline(input.ownerId, input.projectId, input.revision);
  if ("error" in ready) return ready;
  const located = findClip(ready.timeline, input.clipId);
  if (!located) return fail("not_found", "Clip not found.", 404);
  let trackId = located.track.id;
  if (input.trackId && input.trackId !== located.track.id) {
    const target = ready.timeline.tracks.find((track) => track.id === input.trackId);
    if (!target || !isTimelineTrackType(target.type) || !isTimelineTrackType(located.track.type)) {
      return fail("track_type", "That track cannot hold this clip.", 400);
    }
    if (!tracksAreCompatible(located.track.type as TimelineTrackType, target.type as TimelineTrackType)) {
      return fail("track_type", "Move a clip only to a track of the same type.", 400);
    }
    trackId = target.id;
  }
  const shape = applyClipPatch(located.clip, input.patch);
  if (!shape.ok) return fail(shape.code, "The clip change is not valid.", 400);
  if (!(await bump(ready.timeline.id, input.revision))) return fail("conflict", "The timeline changed. Reload it.", 409);
  await prisma.studioTimelineClip.update({
    where: { id: located.clip.id },
    data: { ...shape.value, trackId },
  });
  return getFilmTimeline(input.ownerId, input.projectId);
}

export async function deleteTimelineClip(ownerId: string, projectId: string, revision: number, clipId: string) {
  const ready = await readyTimeline(ownerId, projectId, revision);
  if ("error" in ready) return ready;
  const located = findClip(ready.timeline, clipId);
  if (!located) return fail("not_found", "Clip not found.", 404);
  if (!(await bump(ready.timeline.id, revision))) return fail("conflict", "The timeline changed. Reload it.", 409);
  await prisma.studioTimelineClip.delete({ where: { id: clipId } });
  return getFilmTimeline(ownerId, projectId);
}

export async function addSubtitleLanguage(ownerId: string, projectId: string, revision: number, language: string) {
  const ready = await readyTimeline(ownerId, projectId, revision);
  if ("error" in ready) return ready;
  const tag = normalizeLanguageTag(language);
  if (!tag) return fail("language", "Enter a valid language tag.", 400);
  if (ready.timeline.tracks.some((track) => track.type === "SUBTITLE" && track.language === tag)) {
    return getFilmTimeline(ownerId, projectId);
  }
  const sortOrder = nextSubtitleOrder(ready.timeline.tracks.map((track) => track.sortOrder));
  if (!(await bump(ready.timeline.id, revision))) return fail("conflict", "The timeline changed. Reload it.", 409);
  await prisma.studioTimelineTrack.create({
    data: { timelineId: ready.timeline.id, type: "SUBTITLE", language: tag, sortOrder, subtitleStatus: "draft" },
  });
  return getFilmTimeline(ownerId, projectId);
}

export async function saveSubtitleCues(input: {
  ownerId: string;
  projectId: string;
  revision: number;
  language: string;
  cues: TimelineCue[];
  status?: "draft" | "ready";
}) {
  const ready = await readyTimeline(input.ownerId, input.projectId, input.revision);
  if ("error" in ready) return ready;
  const tag = normalizeLanguageTag(input.language);
  const track = ready.timeline.tracks.find((item) => item.type === "SUBTITLE" && item.language === tag);
  if (!tag || !track) return fail("language", "Add that subtitle language first.", 400);
  const filmEnd = filmEndMs(ready.timeline.tracks.filter((item) => item.type === "VIDEO").flatMap((item) => item.clips));
  const accepted: TimelineCue[] = [];
  for (const cue of input.cues) {
    const check = validateCue(cue, filmEnd || null, accepted);
    if (!check.ok) return fail(check.code, "A subtitle cue is not valid.", 400);
    accepted.push({ ...cue, text: cue.text.trim() });
  }
  const storyboard = ready.project.storyboardId
    ? await prisma.studioStoryboard.findFirst({
        where: { id: ready.project.storyboardId, ownerId: input.ownerId },
        select: { id: true },
      })
    : null;
  if (ready.project.storyboardId && !storyboard) return fail("not_found", "Storyboard not found.", 404);
  if (!(await bump(ready.timeline.id, input.revision))) return fail("conflict", "The timeline changed. Reload it.", 409);
  if (storyboard) {
    await prisma.studioStoryboardSubtitleTrack.upsert({
      where: { storyboardId_language: { storyboardId: storyboard.id, language: tag } },
      create: { storyboardId: storyboard.id, language: tag, status: input.status ?? "draft", entriesJson: cuesToStored(accepted) as Prisma.InputJsonValue },
      update: { status: input.status ?? "draft", entriesJson: cuesToStored(accepted) as Prisma.InputJsonValue },
    });
    await prisma.studioTimelineClip.deleteMany({ where: { trackId: track.id } });
  } else {
    await prisma.studioTimelineClip.deleteMany({ where: { trackId: track.id } });
    if (accepted.length > 0) {
      await prisma.studioTimelineClip.createMany({
        data: accepted.map((cue) => ({
          trackId: track.id,
          startMs: cue.startMs,
          durationMs: cue.endMs - cue.startMs,
          inMs: 0,
          sourceKind: "scene",
          sourceId: cue.sceneId ?? "",
          text: cue.text,
        })),
      });
    }
  }
  await prisma.studioTimelineTrack.update({
    where: { id: track.id },
    data: { subtitleStatus: input.status ?? "draft" },
  });
  return getFilmTimeline(input.ownerId, input.projectId);
}

export async function removeSubtitleLanguage(ownerId: string, projectId: string, revision: number, language: string) {
  const ready = await readyTimeline(ownerId, projectId, revision);
  if ("error" in ready) return ready;
  const tag = normalizeLanguageTag(language);
  const track = ready.timeline.tracks.find((item) => item.type === "SUBTITLE" && item.language === tag);
  if (!tag || !track) return fail("language", "That subtitle language is not on this film.", 404);
  if (!(await bump(ready.timeline.id, revision))) return fail("conflict", "The timeline changed. Reload it.", 409);
  await prisma.studioTimelineTrack.delete({ where: { id: track.id } });
  if (ready.project.storyboardId) {
    await prisma.studioStoryboardSubtitleTrack.deleteMany({
      where: { storyboardId: ready.project.storyboardId, language: tag },
    });
  }
  if (ready.timeline.previewLanguage === tag) {
    await prisma.studioTimeline.update({ where: { id: ready.timeline.id }, data: { previewLanguage: "" } });
  }
  return getFilmTimeline(ownerId, projectId);
}

export async function setPreviewLanguage(ownerId: string, projectId: string, revision: number, language: string) {
  const ready = await readyTimeline(ownerId, projectId, revision);
  if ("error" in ready) return ready;
  const tag = language.trim() ? normalizeLanguageTag(language) : "";
  if (tag == null) return fail("language", "Enter a valid language tag.", 400);
  if (tag && !ready.timeline.tracks.some((track) => track.type === "SUBTITLE" && track.language === tag && track.previewEnabled)) {
    return fail("language", "That language is not on this film.", 400);
  }
  if (!(await bump(ready.timeline.id, revision))) return fail("conflict", "The timeline changed. Reload it.", 409);
  await prisma.studioTimeline.update({ where: { id: ready.timeline.id }, data: { previewLanguage: tag } });
  return getFilmTimeline(ownerId, projectId);
}

export async function exportFilmSubtitles(ownerId: string, projectId: string, language: string, format: "srt" | "vtt") {
  const view = await getFilmTimeline(ownerId, projectId);
  if ("error" in view) return view;
  if (!view.timeline) return fail("not_found", "Timeline not found.", 404);
  const tag = normalizeLanguageTag(language);
  const track = view.timeline.subtitles.find((item) => item.language === tag);
  if (!tag || !track) return fail("language", "That language is not on this film.", 404);
  const project = await getCreativeProjectForOwner(projectId, ownerId);
  const body = format === "srt" ? buildSrt(track.cues) : buildVtt(track.cues, tag);
  return {
    filename: subtitleFilename(project?.title ?? "film", tag, format),
    contentType: format === "srt" ? "application/x-subrip" : "text/vtt",
    body,
  };
}

async function readyTimeline(ownerId: string, projectId: string, revision: number) {
  const owned = await ownedProject(ownerId, projectId);
  if ("error" in owned) return owned;
  const timeline = await loadTimeline(projectId);
  if (!timeline) return fail("not_found", "Create the timeline first.", 404);
  if (!sameRevision(timeline.revision, revision)) return fail("conflict", "The timeline changed. Reload it.", 409);
  return { project: owned.project, timeline };
}

function findClip(timeline: NonNullable<Awaited<ReturnType<typeof loadTimeline>>>, clipId: string) {
  for (const track of timeline.tracks) {
    const clip = track.clips.find((item) => item.id === clipId);
    if (clip) return { track, clip };
  }
  return null;
}

async function resolveSource(input: {
  ownerId: string;
  project: { storyboardId: string | null };
  trackType: TimelineTrackType;
  sourceKind: string;
  sourceId: string;
}): Promise<{ durationMs: number } | Failure> {
  const { ownerId, project, trackType, sourceKind, sourceId } = input;
  if (!sourceId.trim()) return fail("source", "Choose an existing item.", 400);
  if (trackType === "NARRATION") {
    if (sourceKind !== "narration_script" || !project.storyboardId || sourceId !== project.storyboardId) {
      return fail("source", "Narration uses the film script already saved on this project.", 400);
    }
    const board = await prisma.studioStoryboard.findFirst({
      where: { id: project.storyboardId, ownerId },
      select: { voiceNarrationScript: true },
    });
    if (!board) return fail("not_found", "Storyboard not found.", 404);
    return { durationMs: Math.max(1000, board.voiceNarrationScript.trim().length * 80) };
  }
  if (sourceKind === "scene" && (trackType === "VIDEO" || trackType === "DIALOGUE")) {
    if (!project.storyboardId) return fail("source", "This film has no scenes yet.", 400);
    const scene = await prisma.studioScene.findFirst({
      where: { id: sourceId, storyboardId: project.storyboardId, storyboard: { ownerId } },
      select: { durationSeconds: true },
    });
    if (!scene) return fail("not_found", "Scene not found.", 404);
    return { durationMs: Math.max(1000, scene.durationSeconds * 1000) };
  }
  if (sourceKind === "scene_image" && trackType === "VIDEO") {
    const image = await prisma.studioSceneImage.findFirst({
      where: { id: sourceId, scene: { storyboard: { ownerId, id: project.storyboardId ?? "" } } },
      select: { scene: { select: { durationSeconds: true } } },
    });
    if (!image) return fail("not_found", "Image not found.", 404);
    return { durationMs: Math.max(1000, image.scene.durationSeconds * 1000) };
  }
  if (sourceKind === "library_asset") {
    const family = trackType === "MUSIC" ? "music" : trackType === "SFX" ? "sfx" : trackType === "VIDEO" ? "video" : trackType === "DIALOGUE" ? "voice" : "";
    if (!family) return fail("source", "That track cannot use this file.", 400);
    const asset = await prisma.studioLibraryAsset.findFirst({
      where: { id: sourceId, ownerId, family, deletedAt: null },
      select: { durationSeconds: true },
    });
    if (!asset) return fail("not_found", "That file is not in your library.", 404);
    const duration = asset.durationSeconds && asset.durationSeconds > 0 ? Math.round(asset.durationSeconds * 1000) : 5000;
    return { durationMs: duration };
  }
  if (sourceKind === "user_audio" && (trackType === "MUSIC" || trackType === "SFX")) {
    const kind = trackType === "MUSIC" ? "music" : "sfx";
    const library = await listUserAudioLibraryAssets(ownerId).catch(() => []);
    const asset = library.find((item) => item.id === sourceId && item.kind === kind);
    if (!asset) return fail("not_found", "That file is not in your library.", 404);
    return { durationMs: asset.durationSeconds > 0 ? Math.round(asset.durationSeconds * 1000) : 5000 };
  }
  if (sourceKind === "uploaded_video" && trackType === "VIDEO") {
    if (!ownedTimelineMediaUrl(ownerId, sourceId)) {
      return fail("source", "That video is not in your Studio storage.", 403);
    }
    return { durationMs: 6000 };
  }
  if (sourceKind === "uploaded_image" && trackType === "VIDEO") {
    if (!ownedTimelineMediaUrl(ownerId, sourceId)) {
      return fail("source", "That image is not in your Studio storage.", 403);
    }
    return { durationMs: 5000 };
  }
  if ((sourceKind === "animation_transition" || sourceKind === "animation_export") && trackType === "VIDEO") {
    if (sourceKind === "animation_transition") {
      const row = await prisma.animationTransition.findFirst({
        where: { id: sourceId, project: { ownerId } },
        select: { outputVideoUrl: true },
      });
      if (!row?.outputVideoUrl) return fail("not_found", "Video clip not found.", 404);
      return { durationMs: 5000 };
    }
    const row = await prisma.animationExport.findFirst({
      where: { id: sourceId, project: { ownerId } },
      select: { outputVideoUrl: true },
    });
    if (!row?.outputVideoUrl) return fail("not_found", "Video export not found.", 404);
    return { durationMs: 5000 };
  }
  return fail("source", "That item cannot be placed on this track.", 400);
}

type TimelineRow = NonNullable<Awaited<ReturnType<typeof loadTimeline>>>;

async function present(
  ownerId: string,
  project: { id: string; title: string; storyboardId: string | null },
  timeline: TimelineRow,
) {
  const storyboard = project.storyboardId
    ? await prisma.studioStoryboard.findFirst({
        where: { id: project.storyboardId, ownerId },
        select: {
          id: true,
          voiceNarrationScript: true,
          voiceLanguage: true,
          voices: { select: { language: true, audioUrl: true, status: true, storageKey: true } },
          subtitleTracks: { select: { language: true, status: true, entriesJson: true } },
          scenes: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              title: true,
              dialogueText: true,
              durationSeconds: true,
              characters: { select: { characterId: true } },
              selectedSceneImage: { select: { imageUrl: true } },
            },
          },
        },
      })
    : null;
  const userAudioIds = timeline.tracks.flatMap((track) =>
    track.clips.filter((clip) => clip.sourceKind === "user_audio").map((clip) => clip.sourceId),
  );
  const userAudio = userAudioIds.length ? await listUserAudioLibraryAssets(ownerId).catch(() => []) : [];
  const userAudioById = new Map(userAudio.map((asset) => [asset.id, asset]));
  const assetIds = timeline.tracks.flatMap((track) =>
    track.clips.filter((clip) => clip.sourceKind === "library_asset").map((clip) => clip.sourceId),
  );
  const assets = assetIds.length
    ? await prisma.studioLibraryAsset.findMany({
        where: { id: { in: assetIds }, ownerId, deletedAt: null },
        select: { id: true, title: true, previewUrl: true, downloadUrl: true, family: true },
      })
    : [];
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const sceneImageIds = timeline.tracks.flatMap((track) =>
    track.clips.filter((clip) => clip.sourceKind === "scene_image").map((clip) => clip.sourceId),
  );
  const sceneImages = sceneImageIds.length
    ? await prisma.studioSceneImage.findMany({
        where: {
          id: { in: sceneImageIds },
          scene: { storyboard: { ownerId, id: project.storyboardId ?? "" } },
        },
        select: { id: true, imageUrl: true },
      })
    : [];
  const sceneImageById = new Map(sceneImages.map((image) => [image.id, image.imageUrl]));
  const narrationAudio = await resolveFilmNarrationUrl(ownerId, storyboard);
  const videoClips = timeline.tracks.filter((track) => track.type === "VIDEO").flatMap((track) => track.clips);
  const subtitles = timeline.tracks
    .filter((track) => track.type === "SUBTITLE")
    .map((track) => {
      const stored = storyboard?.subtitleTracks.find((item) => item.language === track.language);
      const authority = authoritativeSubtitleCues({
        storyboardId: project.storyboardId,
        storedEntries: stored?.entriesJson,
        trackId: track.id,
        clips: track.clips,
      });
      return {
        trackId: track.id,
        language: track.language,
        status: track.subtitleStatus,
        previewEnabled: track.previewEnabled,
        source: authority.source,
        cues: authority.cues,
      };
    });
  return {
    id: timeline.id,
    projectId: project.id,
    title: project.title,
    storyboardId: project.storyboardId,
    revision: timeline.revision,
    simpleMode: timeline.simpleMode,
    previewLanguage: timeline.previewLanguage,
    filmEndMs: filmEndMs(videoClips),
    scenes: (storyboard?.scenes ?? []).map((scene) => ({
      id: scene.id,
      order: scene.order,
      title: scene.title,
      durationMs: scene.durationSeconds * 1000,
      imageUrl: scene.selectedSceneImage?.imageUrl || null,
      dialogue: presentDialogue({ text: scene.dialogueText, audioUrl: null }),
      characterCount: scene.characters.length,
    })),
    narration: presentNarration({ script: storyboard?.voiceNarrationScript ?? "", audioUrl: narrationAudio }),
    tracks: timeline.tracks.map((track) => ({
      id: track.id,
      type: track.type,
      sortOrder: track.sortOrder,
      muted: track.muted,
      volume: track.volume,
      language: track.language,
      clips: track.clips.map((clip) => {
        const asset = clip.sourceKind === "library_asset" ? assetById.get(clip.sourceId) : null;
        const ownedAudio = clip.sourceKind === "user_audio" ? userAudioById.get(clip.sourceId) : null;
        const scene = storyboard?.scenes.find((item) => item.id === clip.sourceId);
        const projectNarration = narrationClipCarriesProjectAudio({
          trackType: track.type,
          sourceKind: clip.sourceKind,
          sourceId: clip.sourceId,
          storyboardId: project.storyboardId,
        })
          ? narrationAudio
          : null;
        const playbackUrl =
          projectNarration ||
          ownedTimelineMediaUrl(ownerId, clip.sourceKind === "uploaded_video" ? clip.sourceId : "") ||
          ownedAudio?.audioUrl ||
          asset?.downloadUrl ||
          asset?.previewUrl ||
          null;
        const sceneImageUrl = clip.sourceKind === "scene_image" ? sceneImageById.get(clip.sourceId) ?? null : null;
        const stillUrl =
          ownedTimelineMediaUrl(ownerId, clip.sourceKind === "uploaded_image" ? clip.sourceId : "") ||
          sceneImageUrl ||
          scene?.selectedSceneImage?.imageUrl ||
          null;
        return {
          id: clip.id,
          startMs: clip.startMs,
          durationMs: clip.durationMs,
          inMs: clip.inMs,
          outMs: clip.outMs,
          sourceKind: clip.sourceKind,
          sourceId: clip.sourceId,
          text: clip.text,
          volume: clip.volume,
          muted: clip.muted,
          playbackUrl,
          stillUrl,
          mediaKind: stillUrl && !playbackUrl ? "still" : playbackUrl ? "media" : "reference",
          audible: audibleClip({
            muted: clip.muted,
            trackMuted: track.muted,
            volume: clip.volume,
            trackVolume: track.volume,
            playbackUrl,
          }),
        };
      }),
    })),
    subtitles,
  };
}

async function resolveFilmNarrationUrl(
  ownerId: string,
  storyboard: {
    id: string;
    voiceLanguage: string;
    voices: Array<{ language: string; audioUrl: string; status: string; storageKey: string }>;
  } | null,
): Promise<string | null> {
  if (!storyboard) return null;
  const language = storyboard.voiceLanguage.trim().toLowerCase().slice(0, 2);
  const voice = storyboard.voices.find((item) => item.status === "completed" && item.language === language)
    ?? storyboard.voices.find((item) => item.status === "completed");
  if (!voice || !ownedVoiceStorageKey(ownerId, storyboard.id, voice.storageKey)) return null;
  const fresh = await resolvePublicBlobUrlByPathname(voice.storageKey);
  const refreshed = fresh
    ? ownedNarrationAudioUrl({
        ownerId,
        storyboardId: storyboard.id,
        storageKey: voice.storageKey,
        audioUrl: fresh,
      })
    : null;
  return refreshed || ownedNarrationAudioUrl({
    ownerId,
    storyboardId: storyboard.id,
    storageKey: voice.storageKey,
    audioUrl: voice.audioUrl,
  });
}

function ownedTimelineMediaUrl(ownerId: string, value: string): string | null {
  if (!value) return null;
  if (isOwnedProductionBlobUrl(ownerId, value)) return value;
  if (!ownedCertifiedLocalPath(ownerId, value)) return null;
  const id = certifiedLocalMediaId(value);
  return id ? `/api/studio/local-media/${id}` : null;
}
