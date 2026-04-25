import { NextResponse } from "next/server";
import { pollProjectJobs } from "@/server/animation-jobs/service";
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
    const result = await pollProjectJobs(id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to poll jobs." },
      { status: 400 }
    );
  }
}
