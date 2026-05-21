import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  REBUILD_SEGMENTS_MISSING,
  rebuildInstantPremiumFinalVideo,
} from "@/server/instant-premium/rebuild-final-video";
import { getInstantPremiumStatus } from "@/server/instant-premium/status-service";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import { STALE_PLAYBACK_URL } from "@/lib/playback-url-resolution";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
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

  try {
    const rebuild = await rebuildInstantPremiumFinalVideo(id);
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
