import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  getInstantPremiumStatus,
  retryInstantPremiumOverlay,
} from "@/server/instant-premium/status-service";

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
    select: { id: true, ownerId: true, projectType: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (project.ownerId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if ((project.projectType ?? "classic") !== "instant_premium") {
    return NextResponse.json({ error: "Wrong project type." }, { status: 409 });
  }
  try {
    await retryInstantPremiumOverlay(id);
    const status = await getInstantPremiumStatus(id);
    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Retry overlay failed." },
      { status: 400 }
    );
  }
}
