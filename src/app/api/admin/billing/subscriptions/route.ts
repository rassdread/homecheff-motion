import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import {
  listStudioSubscriptionPlans,
  upsertStudioSubscriptionPlan,
} from "@/server/studio-account/studio-subscription-plan-service";

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const plans = await listStudioSubscriptionPlans();
  return NextResponse.json({ ok: true, plans }, { status: 200 });
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }
  const body = (await request.json()) as Record<string, unknown>;
  if (!body.slug || typeof body.slug !== "string" || !body.name) {
    return NextResponse.json({ error: "slug and name required" }, { status: 400 });
  }
  const plan = await upsertStudioSubscriptionPlan({
    slug: body.slug,
    name: String(body.name),
    description: body.description != null ? String(body.description) : undefined,
    monthlyPriceEur: body.monthlyPriceEur as number | null | undefined,
    yearlyPriceEur: body.yearlyPriceEur as number | null | undefined,
    discountPercent: typeof body.discountPercent === "number" ? body.discountPercent : undefined,
    storageLimitGb: body.storageLimitGb as number | null | undefined,
    featureFlags: Array.isArray(body.featureFlags)
      ? body.featureFlags.filter((f): f is string => typeof f === "string")
      : undefined,
    autoTopUpAvailable:
      typeof body.autoTopUpAvailable === "boolean" ? body.autoTopUpAvailable : undefined,
    isVisible: typeof body.isVisible === "boolean" ? body.isVisible : undefined,
    isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    displayOrder: typeof body.displayOrder === "number" ? body.displayOrder : undefined,
    stripePriceIdMonthly:
      body.stripePriceIdMonthly != null ? String(body.stripePriceIdMonthly) : undefined,
    stripePriceIdYearly:
      body.stripePriceIdYearly != null ? String(body.stripePriceIdYearly) : undefined,
  });
  return NextResponse.json({ ok: true, plan }, { status: 200 });
}
