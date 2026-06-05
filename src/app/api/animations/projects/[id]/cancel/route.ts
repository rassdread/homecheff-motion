import { NextResponse } from "next/server";
import {
  cancelProjectRender,
  projectRenderActionSnapshot,
} from "@/server/animation-projects/project-render-actions";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForViewer } from "@/server/animation-projects/queries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const allowed = await getAnimationProjectByIdForViewer(id, user);
  if (!allowed) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let forceLocal = false;
  try {
    const body = (await request.json().catch(() => ({}))) as { forceLocal?: boolean };
    forceLocal = user.role === "admin" && body.forceLocal === true;
  } catch {
    // empty body ok
  }

  try {
    const result = await cancelProjectRender(id, { forceLocal });
    const project = await projectRenderActionSnapshot(id);
    return NextResponse.json({ ...result, project }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cancel failed.";
    return NextResponse.json({ error: message, ok: false }, { status: 400 });
  }
}
