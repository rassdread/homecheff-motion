import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { validatePromoCode } from "@/server/studio-account/studio-promo-code-service";
import { getStudioCreditPackBySlug } from "@/server/studio-account/studio-credit-pack-service";
import { getStudioSubscriptionPlanBySlug } from "@/server/studio-account/studio-subscription-plan-service";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    code?: string;
    checkoutType?: "subscription" | "credit_pack";
    planId?: string;
    packId?: string;
    locale?: "nl" | "en";
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim() ?? "";
  if (!code) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  const pack = body.packId ? await getStudioCreditPackBySlug(body.packId) : null;
  const plan = body.planId ? await getStudioSubscriptionPlanBySlug(body.planId) : null;
  const basePrice =
    body.checkoutType === "credit_pack"
      ? (pack?.priceEur ?? 0)
      : (plan?.monthlyPriceEur ?? 0);

  const result = await validatePromoCode({
    code,
    userId: user.id,
    checkoutType: body.checkoutType,
    planSlug: plan?.slug,
    packSlug: pack?.slug,
    basePriceEur: basePrice,
    locale: body.locale === "en" ? "en" : "nl",
  });

  return NextResponse.json({ ok: result.valid, preview: result }, { status: 200 });
}
