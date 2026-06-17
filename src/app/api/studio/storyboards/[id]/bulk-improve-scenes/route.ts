import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getActionCost } from "@/server/studio-account/studio-action-cost-registry";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { bulkImproveScenesWithApproval } from "@/server/studio/studio-improvement-service";
import type { BulkImproveScenesResponse } from "@/types/studio-improvement";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId } = await context.params;
  const body = (await request.json()) as { sceneIds?: string[]; autoSelect?: boolean };
  const sceneIds = Array.isArray(body.sceneIds) ? body.sceneIds.filter(Boolean) : [];

  if (sceneIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one scene.", code: "NO_SCENES" },
      { status: 400 }
    );
  }

  const unitCost = getActionCost("scene_generation")?.defaultCreditCost ?? 1;

  return runBilledProviderRoute({
    user,
    actionType: "scene_generation",
    projectId: storyboardId,
    overrideCredits: sceneIds.length * unitCost,
    execute: () =>
      bulkImproveScenesWithApproval(storyboardId, sceneIds, user, {
        autoSelect: body.autoSelect,
      }),
    isFailure: (result) => "error" in result,
    buildCostEvent: (result) =>
      "error" in result
        ? null
        : {
            provider: "openai",
            costActionType: "openai_scene_image",
            unitType: "request",
            unitsUsed: Math.max(1, result.results.filter((r) => r.ok).length),
            unitCostUsd: 0.04,
            userId: user.id,
            projectId: storyboardId,
            status: "completed",
            metadataJson: { feature: "bulk_improve_scenes" },
          },
    onSuccess: (result, estimatedCredits) => {
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error.message, code: result.error.code },
          { status: result.error.httpStatus }
        );
      }
      const response: BulkImproveScenesResponse = result;
      return NextResponse.json(withEstimatedCredits(response, estimatedCredits), { status: 200 });
    },
  });
}
