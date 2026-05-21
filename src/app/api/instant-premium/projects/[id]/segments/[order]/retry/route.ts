import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForOwner } from "@/server/animation-projects/queries";
import { retryInstantPremiumSegment } from "@/server/instant-premium/retry-segment";

type RouteContext = {
  params: Promise<{ id: string; order: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const { id, order: orderRaw } = await context.params;
  const order = Number.parseInt(orderRaw, 10);
  if (!Number.isFinite(order) || order < 0) {
    return NextResponse.json({ error: "Invalid segment order." }, { status: 400 });
  }

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
    const status = await retryInstantPremiumSegment(id, order);
    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Segment retry failed." },
      { status: 400 }
    );
  }
}
