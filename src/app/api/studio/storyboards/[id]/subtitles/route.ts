import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  buildSrtFromSubtitleEntries,
  parseSubtitleEntriesJson,
} from "@/lib/studio-subtitle-track";
import { getStudioStoryboardById } from "@/server/studio/studio-storyboard-service";
import { prisma } from "@/lib/prisma";
import type { SubtitleTrackEntry } from "@/types/studio-voice-execution";

type RouteContext = { params: Promise<{ id: string }> };

function parseEntriesBody(raw: unknown): SubtitleTrackEntry[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const entries: SubtitleTrackEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      continue;
    }
    const o = row as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text : "";
    const start = typeof o.start === "number" ? o.start : NaN;
    const end = typeof o.end === "number" ? o.end : NaN;
    if (!text.trim() || !Number.isFinite(start) || !Number.isFinite(end)) {
      continue;
    }
    entries.push({
      start,
      end,
      text: text.trim(),
      sceneId: typeof o.sceneId === "string" ? o.sceneId : undefined,
    });
  }
  return entries;
}

export async function GET(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  const { id } = await context.params;
  const storyboard = await getStudioStoryboardById(id, user);
  if (!storyboard) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const url = new URL(request.url);
  const lang =
    url.searchParams.get("language")?.trim().toLowerCase().slice(0, 2) ||
    (storyboard.voiceLanguage ?? "en").slice(0, 2);
  const format = url.searchParams.get("format")?.trim().toLowerCase() || "json";

  const track = await prisma.studioStoryboardSubtitleTrack.findUnique({
    where: { storyboardId_language: { storyboardId: id, language: lang } },
  });
  if (!track) {
    return NextResponse.json({ entries: [], srt: "" });
  }
  const entries = parseSubtitleEntriesJson(track.entriesJson);
  if (format === "srt") {
    return new NextResponse(buildSrtFromSubtitleEntries(entries), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.json({
    language: track.language,
    status: track.status,
    entries,
    srt: buildSrtFromSubtitleEntries(entries),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  const { id } = await context.params;
  const storyboard = await getStudioStoryboardById(id, user);
  if (!storyboard) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (storyboard.ownerId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    language?: string;
    entries?: unknown;
  } | null;
  const entries = parseEntriesBody(body?.entries);
  if (!entries) {
    return NextResponse.json({ error: "entries array required." }, { status: 400 });
  }
  const lang =
    body?.language?.trim().toLowerCase().slice(0, 2) ||
    (storyboard.voiceLanguage ?? "en").slice(0, 2);

  const track = await prisma.studioStoryboardSubtitleTrack.upsert({
    where: { storyboardId_language: { storyboardId: id, language: lang } },
    create: {
      storyboardId: id,
      language: lang,
      status: "ready",
      entriesJson: entries,
    },
    update: {
      entriesJson: entries,
      status: "ready",
    },
  });

  return NextResponse.json({
    ok: true,
    track: {
      ...track,
      entries,
      srt: buildSrtFromSubtitleEntries(entries),
    },
  });
}
