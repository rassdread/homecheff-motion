import { NextResponse } from "next/server";
import { cancelInProgressAnimationExport } from "@/server/animation-export/cancel-user-export";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForViewer } from "@/server/animation-projects/queries";
import type { ExportRouteResponse } from "@/types/animation-api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const allowed = await getAnimationProjectByIdForViewer(id, user);
  if (!allowed) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    const project = await cancelInProgressAnimationExport(id);
    const body: ExportRouteResponse = { project };
    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cancel failed.";
    const body: ExportRouteResponse = { error: message };
    return NextResponse.json(body, { status: 400 });
  }
}
