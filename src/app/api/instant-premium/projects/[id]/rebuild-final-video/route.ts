import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  REBUILD_FAILED_TIMEOUT,
  REBUILD_SEGMENTS_MISSING,
  STALE_REBUILD_OUTPUT,
  rebuildInstantPremiumFinalVideo,
} from "@/server/instant-premium/rebuild-final-video";
import { resolveExportTimeoutMs } from "@/lib/export-timeout";

export const maxDuration = 300;
import { getInstantPremiumStatus } from "@/server/instant-premium/status-service";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import { STALE_PLAYBACK_URL } from "@/lib/playback-url-resolution";
import { prisma } from "@/lib/prisma";
import { persistInstantSceneTextsForProject } from "@/server/instant-premium/persist-instant-scene-texts";
import { appendTextVersionNote } from "@/lib/text-version-notes";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let sceneTextsPayload: unknown;
  let versionNote = "";
  try {
    const body = (await request.json().catch(() => null)) as {
      sceneTexts?: unknown;
      versionNote?: string;
    } | null;
    if (body && body.sceneTexts !== undefined) {
      sceneTextsPayload = body.sceneTexts;
    }
    if (body?.versionNote?.trim()) {
      versionNote = body.versionNote.trim();
    }
  } catch {
    // Empty body is valid — rebuild from stored texts.
  }

  const project = await prisma.animationProject.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      projectType: true,
      stylePreset: true,
      instantOutputDurationSeconds: true,
      instantSelectedChips: true,
      instantUserIntent: true,
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (!isInstantLikeProject(project)) {
    return NextResponse.json({ error: "Wrong project type." }, { status: 409 });
  }
  if (project.ownerId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (sceneTextsPayload !== undefined) {
    const persisted = await persistInstantSceneTextsForProject(id, sceneTextsPayload);
    if (!persisted.ok) {
      return NextResponse.json({ error: persisted.error }, { status: persisted.status });
    }
  }

  try {
    const rebuild = await rebuildInstantPremiumFinalVideo(id);
    if (rebuild.ok && versionNote) {
      const notesProject = await prisma.animationProject.findUnique({
        where: { id },
        select: { instantFinalRebuildCount: true, instantTextVersionNotesJson: true },
      });
      if (notesProject) {
        await prisma.animationProject.update({
          where: { id },
          data: {
            instantTextVersionNotesJson: appendTextVersionNote(
              notesProject.instantTextVersionNotesJson,
              {
                version: notesProject.instantFinalRebuildCount,
                note: versionNote,
                createdAt: new Date().toISOString(),
              }
            ),
          },
        });
      }
    }
    const status = await getInstantPremiumStatus(id);
    const httpStatus = rebuild.ok
      ? 200
      : rebuild.code === REBUILD_SEGMENTS_MISSING
        ? 400
        : rebuild.clipsReady
          ? 202
          : 400;
    return NextResponse.json(
      {
        rebuild,
        status,
        finalVideoUrl: rebuild.finalVideoUrl ?? status?.finalVideoUrl ?? null,
        ...(rebuild.code === REBUILD_SEGMENTS_MISSING ? { code: REBUILD_SEGMENTS_MISSING } : {}),
        ...(rebuild.code === STALE_PLAYBACK_URL ? { code: STALE_PLAYBACK_URL } : {}),
        ...(rebuild.code === REBUILD_FAILED_TIMEOUT ? { code: REBUILD_FAILED_TIMEOUT } : {}),
        ...(rebuild.code === STALE_REBUILD_OUTPUT ? { code: STALE_REBUILD_OUTPUT } : {}),
        exportTimeoutMs: resolveExportTimeoutMs(),
      },
      { status: httpStatus }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rebuild failed." },
      { status: 500 }
    );
  }
}
