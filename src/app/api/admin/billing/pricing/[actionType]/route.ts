import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { updateStudioPricingCatalogRule } from "@/server/studio-account/studio-pricing-rule-service";
import type { StudioPricingRuleUpdateInput } from "@/types/studio-pricing-catalog";

type RouteContext = { params: Promise<{ actionType: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const { actionType } = await context.params;
  const decoded = decodeURIComponent(actionType);
  const body = (await request.json()) as StudioPricingRuleUpdateInput;

  if (body.creditCost !== undefined && body.creditCost < 0) {
    return NextResponse.json({ error: "admin.pricing.errors.invalidCredits" }, { status: 400 });
  }

  const item = await updateStudioPricingCatalogRule(decoded, body, gate.id);
  if (!item) {
    return NextResponse.json({ error: "admin.pricing.errors.notFound" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item }, { status: 200 });
}
