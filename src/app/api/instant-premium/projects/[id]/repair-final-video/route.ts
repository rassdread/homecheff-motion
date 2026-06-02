import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/server/auth/permissions";
import { getInstantPremiumStatus } from "@/server/instant-premium/status-service";
import { startInstantVideoRepair } from "@/server/instant-premium/start-instant-video-repair";

export const maxDuration = 60;

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

  try {
    const repair = await startInstantVideoRepair(id, {
      force: true,
      source: "repair-api",
      scheduleBackground: true,
    });
    const status = await getInstantPremiumStatus(id);
    const httpStatus = repair.completedImmediately
      ? 200
      : repair.alreadyRunning
        ? 409
        : repair.accepted
          ? 202
          : repair.ok
            ? 200
            : 400;

    return NextResponse.json(
      {
        repair,
        status,
        repairAdminDetail: status.repairAdminDetail ?? null,
      },
      { status: httpStatus }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Repair failed." },
      { status: 400 }
    );
  }
}
