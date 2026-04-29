import { NextResponse } from "next/server";
import { pollProjectExport } from "@/server/animation-export/service";
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
  const project = await getAnimationProjectByIdForOwner(id, user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if ((project.projectType ?? "classic") !== "classic") {
    console.info("[hc-animation-export]", {
      action: "blocked_wrong_project_type",
      projectId: id,
      projectType: project.projectType ?? "classic",
    });
    return NextResponse.json({ error: "Classic export is not available for this project type." }, { status: 409 });
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
