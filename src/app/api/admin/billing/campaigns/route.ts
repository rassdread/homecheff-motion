import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { patchStudioBillingPolicy } from "@/server/studio-account/studio-billing-policy-service";
import { loadStudioBillingPolicy } from "@/server/studio-account/studio-billing-policy-service";
import type { CarryMode } from "@/types/studio-billing";

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const policy = await loadStudioBillingPolicy();
  return NextResponse.json({ ok: true, policy }, { status: 200 });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const body = (await request.json()) as {
    carryMode?: CarryMode;
    newUserGrantCredits?: number;
    newUserPromotionCredits?: number;
    betaLaunchCredits?: number;
    newUserCampaignMaxUsers?: number;
    defaultConfirmAboveCredits?: number;
  };
  const policy = await patchStudioBillingPolicy(body);
  return NextResponse.json({ ok: true, policy }, { status: 200 });
}
