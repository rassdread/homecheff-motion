import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { applyReverseStoryOrder, placeProjectMediaOnTimeline } from "@/server/studio/studio-film-timeline-arrange";
import {
  addSubtitleLanguage,
  addTimelineClip,
  createFilmTimeline,
  deleteTimelineClip,
  exportFilmSubtitles,
  getFilmTimeline,
  removeSubtitleLanguage,
  saveSubtitleCues,
  setPreviewLanguage,
  setTimelineMode,
  setTimelineTrack,
  updateTimelineClip,
} from "@/server/studio/studio-timeline-service";
import type { TimelineCue } from "@/lib/studio-timeline";

type Ctx = { params: Promise<{ projectId: string }> };

function jsonError(error: { message: string; code: string; httpStatus: number }) {
  return NextResponse.json({ error: error.message, code: error.code }, { status: error.httpStatus });
}

export async function GET(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const url = new URL(request.url);
  const format = url.searchParams.get("export");
  if (format === "srt" || format === "vtt") {
    const result = await exportFilmSubtitles(user.id, projectId, url.searchParams.get("language") ?? "", format);
    if ("error" in result) return jsonError(result.error);
    return new NextResponse(result.body, {
      headers: {
        "Content-Type": `${result.contentType}; charset=utf-8`,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  }
  const result = await getFilmTimeline(user.id, projectId);
  if ("error" in result) return jsonError(result.error);
  return NextResponse.json(result);
}

export async function POST(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" ? body.action : "";
  const revision = typeof body?.revision === "number" ? body.revision : -1;
  if (action === "create") {
    const result = await createFilmTimeline(user.id, projectId);
    if ("error" in result) return jsonError(result.error);
    return NextResponse.json(result);
  }
  if (action === "mode") {
    const result = await setTimelineMode(user.id, projectId, revision, body?.simpleMode !== false);
    if ("error" in result) return jsonError(result.error);
    return NextResponse.json(result);
  }
  if (action === "track") {
    const result = await setTimelineTrack({
      ownerId: user.id,
      projectId,
      revision,
      trackId: stringField(body?.trackId),
      muted: typeof body?.muted === "boolean" ? body.muted : undefined,
      volume: typeof body?.volume === "number" ? body.volume : undefined,
    });
    if ("error" in result) return jsonError(result.error);
    return NextResponse.json(result);
  }
  if (action === "add-clip") {
    const result = await addTimelineClip({
      ownerId: user.id,
      projectId,
      revision,
      trackId: stringField(body?.trackId),
      sourceKind: stringField(body?.sourceKind),
      sourceId: stringField(body?.sourceId),
      startMs: typeof body?.startMs === "number" ? body.startMs : 0,
      durationMs: typeof body?.durationMs === "number" ? body.durationMs : undefined,
      clientRequestId: stringField(body?.clientRequestId),
      confirmDuplicate: body?.confirmDuplicate === true,
    });
    if ("error" in result) return jsonError(result.error);
    return NextResponse.json(result);
  }
  if (action === "update-clip") {
    const result = await updateTimelineClip({
      ownerId: user.id,
      projectId,
      revision,
      clipId: stringField(body?.clipId),
      trackId: typeof body?.trackId === "string" ? body.trackId : undefined,
      patch: clipPatch(body?.patch),
    });
    if ("error" in result) return jsonError(result.error);
    return NextResponse.json(result);
  }
  if (action === "delete-clip") {
    const result = await deleteTimelineClip(user.id, projectId, revision, stringField(body?.clipId));
    if ("error" in result) return jsonError(result.error);
    return NextResponse.json(result);
  }
  if (action === "add-language") {
    const result = await addSubtitleLanguage(user.id, projectId, revision, stringField(body?.language));
    if ("error" in result) return jsonError(result.error);
    return NextResponse.json(result);
  }
  if (action === "save-cues") {
    const result = await saveSubtitleCues({
      ownerId: user.id,
      projectId,
      revision,
      language: stringField(body?.language),
      cues: cuesField(body?.cues),
      status: body?.status === "ready" ? "ready" : "draft",
    });
    if ("error" in result) return jsonError(result.error);
    return NextResponse.json(result);
  }
  if (action === "remove-language") {
    const result = await removeSubtitleLanguage(user.id, projectId, revision, stringField(body?.language));
    if ("error" in result) return jsonError(result.error);
    return NextResponse.json(result);
  }
  if (action === "place-media") {
    const videos = Array.isArray(body?.videoAssetIds) ? body.videoAssetIds.filter((id): id is string => typeof id === "string") : [];
    const dialogue = Array.isArray(body?.dialogueAssetIds) ? body.dialogueAssetIds.filter((id): id is string => typeof id === "string") : [];
    const result = await placeProjectMediaOnTimeline({
      ownerId: user.id,
      projectId,
      videoAssetIdsInStoryOrder: videos,
      dialogueAssetIdsInStoryOrder: dialogue,
      musicAssetId: typeof body?.musicAssetId === "string" ? body.musicAssetId : null,
    });
    if ("error" in result) return jsonError(result.error);
    return NextResponse.json(result);
  }
  if (action === "reverse-story") {
    const result = await applyReverseStoryOrder(user.id, projectId);
    if ("error" in result) return jsonError(result.error);
    return NextResponse.json(result);
  }
  if (action === "preview-language") {
    const result = await setPreviewLanguage(user.id, projectId, revision, stringField(body?.language));
    if ("error" in result) return jsonError(result.error);
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: "Unknown action.", code: "action" }, { status: 400 });
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function clipPatch(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const patch = value as Record<string, unknown>;
  return {
    startMs: typeof patch.startMs === "number" ? patch.startMs : undefined,
    durationMs: typeof patch.durationMs === "number" ? patch.durationMs : undefined,
    inMs: typeof patch.inMs === "number" ? patch.inMs : undefined,
    outMs: patch.outMs === null ? null : typeof patch.outMs === "number" ? patch.outMs : undefined,
    volume: typeof patch.volume === "number" ? patch.volume : undefined,
    muted: typeof patch.muted === "boolean" ? patch.muted : undefined,
    text: typeof patch.text === "string" ? patch.text : undefined,
  };
}

function cuesField(value: unknown): TimelineCue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const cue = row as Record<string, unknown>;
    if (typeof cue.text !== "string" || typeof cue.startMs !== "number" || typeof cue.endMs !== "number") return [];
    return [{ text: cue.text, startMs: cue.startMs, endMs: cue.endMs, sceneId: typeof cue.sceneId === "string" ? cue.sceneId : undefined }];
  });
}
