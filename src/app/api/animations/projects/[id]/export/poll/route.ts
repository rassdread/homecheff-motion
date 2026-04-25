import { NextResponse } from "next/server";
import { pollProjectExport } from "@/server/animation-export/service";
import { getAuthenticatedUser } from "@/server/auth/session";
import { getAnimationProjectByIdForOwner } from "@/server/animation-projects/queries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const project = await getAnimationProjectByIdForOwner(id, user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    const project = await pollProjectExport(id);
    return NextResponse.json({ project }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export poll failed." },
      { status: 404 }
    );
  }
}
