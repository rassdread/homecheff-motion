import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/server/auth/permissions";
import { startQueuedSegmentsWithoutJob } from "@/server/animation-jobs/service";
import { getInstantPremiumStatus } from "@/server/instant-premium/status-service";

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
  const instantLike =
    project.projectType === "instant_premium" ||
    project.stylePreset === "food_promo" ||
    project.stylePreset === "clean_business" ||
    project.stylePreset === "social_boost" ||
    project.instantOutputDurationSeconds != null ||
    project.instantSelectedChips != null ||
    (project.instantUserIntent?.trim().length ?? 0) > 0;
  if (!instantLike) {
    return NextResponse.json({ error: "Wrong project type." }, { status: 409 });
  }
  if (project.ownerId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const started = await startQueuedSegmentsWithoutJob(id);
  const status = await getInstantPremiumStatus(id);
  return NextResponse.json({ started, status }, { status: 200 });
}

