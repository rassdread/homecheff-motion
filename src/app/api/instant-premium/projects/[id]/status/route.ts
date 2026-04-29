import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForOwner } from "@/server/animation-projects/queries";
import { getInstantPremiumStatus } from "@/server/instant-premium/status-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const ownedProject = await getAnimationProjectByIdForOwner(id, user.id);
  if (!ownedProject) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if ((ownedProject.projectType ?? "classic") !== "instant_premium") {
    return NextResponse.json({ error: "Wrong project type." }, { status: 409 });
  }

  try {
    const status = await getInstantPremiumStatus(id);
    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load Instant Premium status." },
      { status: 400 }
    );
  }
}
