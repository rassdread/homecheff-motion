import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getStudioStoryboardById } from "@/server/studio/studio-storyboard-service";
import { listStoryboardMotionProjects } from "@/server/studio/list-storyboard-motion-projects";
import type { StudioMotionProjectsResponse } from "@/types/studio-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const storyboard = await getStudioStoryboardById(id, user);
  if (!storyboard) {
    return NextResponse.json({ error: "Not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  const rows = await listStoryboardMotionProjects(id, user.id);
  const body: StudioMotionProjectsResponse = {
    projects: rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      projectType: row.projectType,
      updatedAt: row.updatedAt.toISOString(),
      latestExportStatus: row.latestExportStatus,
      hasCompletedFinal: row.latestExportStatus === "completed" && Boolean(row.latestExportVideoUrl),
    })),
  };

  return NextResponse.json(body, { status: 200 });
}
