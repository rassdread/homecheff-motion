import { NextResponse } from "next/server";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import { fetchWorkerVideoHealth } from "@/lib/video-worker-client";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForViewer } from "@/server/animation-projects/queries";
import { getInstantPremiumStatus } from "@/server/instant-premium/status-service";
import type { InstantPremiumStatusApiResponse } from "@/types/animation-api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isInstantLikeProject(project: {
  projectType?: string | null;
  stylePreset?: string | null;
  instantOutputDurationSeconds?: number | null;
  instantSelectedChips?: unknown;
  instantUserIntent?: string | null;
}): boolean {
  return (
    project.projectType === "instant_premium" ||
    project.stylePreset === "food_promo" ||
    project.stylePreset === "clean_business" ||
    project.stylePreset === "social_boost" ||
    project.instantOutputDurationSeconds != null ||
    project.instantSelectedChips != null ||
    (project.instantUserIntent?.trim().length ?? 0) > 0
  );
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const ownedProject = await getAnimationProjectByIdForViewer(id, user);
  if (!ownedProject) {
    const body: InstantPremiumStatusApiResponse = {
      availability: "not_found",
      projectId: id,
      error: "Project not found.",
    };
    return NextResponse.json(body, { status: 404 });
  }
  if (!isInstantLikeProject(ownedProject)) {
    return NextResponse.json({ error: "Wrong project type." }, { status: 409 });
  }

  try {
    const status = await getInstantPremiumStatus(id);

    if (isVideoRenderWorkerMode()) {
      const workerBusy =
        status.workerJobStatus === "queued" ||
        status.workerJobStatus === "running" ||
        status.status === "finalizing";
      if (workerBusy) {
        const workerHealth = await fetchWorkerVideoHealth();
        if (workerHealth && !workerHealth.ok) {
          const body: InstantPremiumStatusApiResponse = {
            availability: "worker_unreachable",
            projectId: id,
            workerJobStatus: status.workerJobStatus ?? "queued",
            error: "Video worker is connecting.",
          };
          return NextResponse.json(body, { status: 503 });
        }
      }
    }

    const body: InstantPremiumStatusApiResponse = {
      availability: "ok",
      ...status,
    };
    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load Instant Premium status.";
    const notFound = /not found/i.test(message);
    if (notFound) {
      return NextResponse.json(
        { availability: "not_found", projectId: id, error: message } satisfies InstantPremiumStatusApiResponse,
        { status: 404 }
      );
    }
    return NextResponse.json(
      { availability: "temporary_unavailable", projectId: id, error: message } satisfies InstantPremiumStatusApiResponse,
      { status: 503 }
    );
  }
}
