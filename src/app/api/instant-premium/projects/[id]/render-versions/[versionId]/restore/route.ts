import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import { restoreProjectRenderVersion } from "@/server/instant-premium/render-version-service";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string; versionId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id: projectId, versionId } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, projectType: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (!isInstantLikeProject(project)) {
    return NextResponse.json({ error: "Wrong project type." }, { status: 409 });
  }

  const result = await restoreProjectRenderVersion({
    projectId,
    renderVersionId: versionId,
    userId: user.id,
    isAdmin: user.role === "admin",
  });

  if (!result.ok) {
    const status =
      result.code === "FORBIDDEN" ? 403 : result.code === "NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }

  return NextResponse.json({
    ok: true,
    finalVideoUrl: result.finalVideoUrl,
    renderVersionId: versionId,
  });
}
