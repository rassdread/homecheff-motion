import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForOwner } from "@/server/animation-projects/queries";
import { retryInstantPremiumSegment } from "@/server/instant-premium/retry-segment";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";

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

  return runBilledProviderRoute({
    user,
    actionType: "motion_render",
    projectId: id,
    relatedJobId: `${id}-segment-${order}`,
    execute: async () => {
      try {
        const status = await retryInstantPremiumSegment(id, order);
        return { ok: true as const, status };
      } catch (error) {
        return {
          ok: false as const,
          error: error instanceof Error ? error.message : "Segment retry failed.",
        };
      }
    },
    isFailure: (result) => !result.ok,
    onSuccess: (result, estimatedCredits) => {
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json(withEstimatedCredits(result.status, estimatedCredits), { status: 200 });
    },
  });
}
