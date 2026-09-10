import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { previewStudioCreditAuthorization } from "@/server/studio-account/studio-credit-authorization";
import {
  STUDIO_ACTION_TYPES,
  type StudioActionType,
} from "@/server/studio-account/studio-action-cost-registry";
import { buildCreativePlanV2 } from "@/lib/simple-studio/intent-routing";
import { summarizeCreativePlanNl } from "@/lib/simple-studio/creative-plan";
import type { SimpleStudioMediaItem } from "@/lib/simple-studio/creative-plan";
import type { SimpleStudioPurpose } from "@/lib/simple-studio/catalog";
import { simpleStudioExportActionForPlan } from "@/lib/simple-studio/orchestrator";
import {
  estimateLipsyncReservedUsd,
  getLipsyncProviderId,
  isTrueLipsyncConfigured,
} from "@/lib/lipsync/config";
import { usdToCredits } from "@/lib/studio-credit-constants";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  let body: {
    story?: string;
    purpose?: string;
    media?: SimpleStudioMediaItem[];
    revisionInstruction?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_BODY" }, { status: 400 });
  }

  const story = body.story?.trim() ?? "";
  if (story.length < 8) {
    return NextResponse.json({ error: "Story required", code: "STORY_REQUIRED" }, { status: 400 });
  }

  const media = Array.isArray(body.media) ? body.media : [];
  const lipsyncEngineAvailable = isTrueLipsyncConfigured();
  const plan = buildCreativePlanV2({
    story,
    media,
    purposeHint: (body.purpose as SimpleStudioPurpose | "universal") || "universal",
    revisionInstruction: body.revisionInstruction,
    lipsyncEngineAvailable,
  });

  const actions = [...plan.hcActions];
  const exportAction = simpleStudioExportActionForPlan(plan);
  if (
    !actions.includes(exportAction) &&
    !plan.engineChain.includes("motion_deeplink") &&
    !plan.engineChain.includes("lipsync_avatar")
  ) {
    actions.push(exportAction);
  }

  const lines: Array<{
    actionType: string;
    requiredCredits: number;
    allowed: boolean;
    reason?: string;
  }> = [];
  let total = 0;
  let allAllowed = true;

  for (const actionType of actions) {
    if (!STUDIO_ACTION_TYPES.includes(actionType as StudioActionType)) continue;
    let overrideCredits: number | undefined;
    if (actionType === "lipsync_talking_avatar") {
      overrideCredits = usdToCredits(
        estimateLipsyncReservedUsd({
          provider: getLipsyncProviderId(),
          durationSeconds: plan.durationSeconds,
        }),
        50,
      );
    }
    const preview = await previewStudioCreditAuthorization({
      user,
      actionType,
      overrideCredits,
    });
    lines.push({
      actionType,
      requiredCredits: preview.requiredCredits,
      allowed: preview.allowed,
      reason: preview.reason ?? undefined,
    });
    total += preview.requiredCredits;
    if (!preview.allowed) allAllowed = false;
  }

  const summary = summarizeCreativePlanNl(plan, total);

  return NextResponse.json({
    ok: true,
    plan,
    summary,
    quote: {
      allowed: allAllowed,
      requiredCredits: total,
      lines,
    },
    lipsyncConfigured: lipsyncEngineAvailable,
  });
}
