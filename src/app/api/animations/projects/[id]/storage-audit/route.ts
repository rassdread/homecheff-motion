import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForViewer } from "@/server/animation-projects/queries";
import { auditProjectStorage } from "@/server/animation-projects/project-storage-audit";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Project storage audit for owner or admin. */
export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireActiveUser();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const { id } = await context.params;
  const project = await getAnimationProjectByIdForViewer(id, gate);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const audit = await auditProjectStorage({ project });
  return NextResponse.json({ ok: true, audit });
}
