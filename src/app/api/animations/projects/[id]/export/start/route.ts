import { NextResponse } from "next/server";
import { startProjectExport } from "@/server/animation-export/service";
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
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    const project = await startProjectExport(id);
    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed.";
    const project = await getAnimationProjectByIdForOwner(id, user.id);
    if (project) {
      return NextResponse.json({ error: message, project }, { status: 200 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
