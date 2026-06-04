import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  mergeMotionAudioExportIntoHandoffStorage,
  parseMotionStudioAudioExport,
  readMotionAudioExportFromHandoffJson,
} from "@/lib/motion-voice-export";
import { sanitizeMotionHandoffForStorage } from "@/lib/studio-motion-handoff-storage";
import type { MotionSubtitleExportMode } from "@/types/motion-voice-export";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: projectId } = await context.params;
  const project = await prisma.animationProject.findFirst({
    where: { id: projectId, ownerId: user.id },
    select: { id: true, studioHandoffJson: true, projectType: true },
  });
  if (!project || project.projectType !== "instant_premium") {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const current = readMotionAudioExportFromHandoffJson(project.studioHandoffJson);
  if (!current) {
    return NextResponse.json({ error: "No Studio voice metadata on this project." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const patch = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};

  const subtitleMode = patch.subtitleMode;
  const mode: MotionSubtitleExportMode | undefined =
    subtitleMode === "off" || subtitleMode === "burn_in" || subtitleMode === "metadata_only"
      ? subtitleMode
      : undefined;

  const next = {
    ...current,
    ...(typeof patch.voiceEnabled === "boolean" ? { voiceEnabled: patch.voiceEnabled } : {}),
    ...(typeof patch.subtitlesEnabled === "boolean"
      ? { subtitlesEnabled: patch.subtitlesEnabled }
      : {}),
    ...(mode ? { subtitleMode: mode } : {}),
  };

  const base =
    project.studioHandoffJson && typeof project.studioHandoffJson === "object" && !Array.isArray(project.studioHandoffJson)
      ? (project.studioHandoffJson as Record<string, unknown>)
      : {};
  const stored = mergeMotionAudioExportIntoHandoffStorage(
    sanitizeMotionHandoffForStorage(base as Record<string, unknown>),
    next
  );

  await prisma.animationProject.update({
    where: { id: projectId },
    data: { studioHandoffJson: stored as object },
  });

  return NextResponse.json({
    ok: true,
    audioExport: parseMotionStudioAudioExport(stored.motionAudioExport),
  });
}
