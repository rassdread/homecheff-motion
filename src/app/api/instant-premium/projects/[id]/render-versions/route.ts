import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import {
  compareRenderVersions,
  listProjectRenderVersions,
} from "@/server/instant-premium/render-version-service";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
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
  if (!isInstantLikeProject(project)) {
    return NextResponse.json({ error: "Wrong project type." }, { status: 409 });
  }
  if (project.ownerId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const url = new URL(request.url);
  const compareA = url.searchParams.get("compareA");
  const compareB = url.searchParams.get("compareB");

  const versions = await listProjectRenderVersions(id);
  const diff =
    compareA && compareB ? await compareRenderVersions(id, compareA, compareB) : undefined;

  return NextResponse.json({ versions, diff });
}
