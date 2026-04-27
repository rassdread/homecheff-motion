import { NextResponse } from "next/server";
import { hcExportRetryLog } from "@/lib/hc-export-retry-debug";
import { retryProjectExport } from "@/server/animation-export/service";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForOwner } from "@/server/animation-projects/queries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const ownedProject = await getAnimationProjectByIdForOwner(id, user.id);
  if (!ownedProject) {
    hcExportRetryLog("server", "api.retry.forbidden_or_missing", { projectId: id });
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  hcExportRetryLog("server", "api.retry.request", { projectId: id, userId: user.id });

  try {
    const project = await retryProjectExport(id);
    hcExportRetryLog("server", "api.retry.ok", {
      projectId: id,
      projectStatus: project.status,
      exportStatus: project.exports[0]?.status,
      exportProgress: project.exports[0]?.progress,
    });
    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export retry failed.";
    hcExportRetryLog("server", "api.retry.error", { projectId: id, message });
    const project = await getAnimationProjectByIdForOwner(id, user.id);
    if (project) {
      return NextResponse.json({ error: message, project }, { status: 200 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
