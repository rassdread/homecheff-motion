import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  createCreditPackCheckout,
  createSubscriptionCheckout,
  isStripeCheckoutAvailable,
} from "@/server/studio-account/stripe-billing";
import { getStudioSubscriptionPlanBySlug } from "@/server/studio-account/studio-subscription-plan-service";
import { getStudioCreditPackBySlug } from "@/server/studio-account/studio-credit-pack-service";
import type { StudioPlanId } from "@/server/studio-account/studio-plan-config";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  if (!(await isStripeCheckoutAvailable())) {
    return NextResponse.json(
      { error: "Stripe checkout is not configured.", code: "STRIPE_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  let body: {
    type?: string;
    planId?: string;
    packId?: string;
    billingInterval?: string;
    returnPath?: string;
    promoCode?: string;
    locale?: "nl" | "en";
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const returnPath = body.returnPath?.trim() || "/account/billing";
  const successUrl = `${baseUrl}${returnPath}?checkout=success`;
  const cancelUrl = `${baseUrl}${returnPath}?checkout=cancel`;
  const locale = body.locale === "en" ? "en" : "nl";

  if (body.type === "subscription") {
    const planId = body.planId as StudioPlanId;
    const plan = planId ? await getStudioSubscriptionPlanBySlug(planId) : null;
    if (!plan || !plan.isActive || planId === "free") {
      return NextResponse.json({ error: "Invalid plan.", code: "INVALID_PLAN" }, { status: 400 });
    }
    const billingInterval = body.billingInterval === "yearly" ? "yearly" : "monthly";
    const result = await createSubscriptionCheckout({
      userId: user.id,
      email: user.email,
      planId,
      billingInterval,
      successUrl,
      cancelUrl,
      promoCode: body.promoCode,
      locale,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error, code: "CHECKOUT_FAILED" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  }

  if (body.type === "credit_pack") {
    const pack = await getStudioCreditPackBySlug(body.packId ?? "");
    if (!pack || !pack.active) {
      return NextResponse.json({ error: "Invalid pack.", code: "INVALID_PACK" }, { status: 400 });
    }
    const result = await createCreditPackCheckout({
      userId: user.id,
      email: user.email,
      packId: pack.slug,
      successUrl,
      cancelUrl,
      promoCode: body.promoCode,
      locale,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error, code: "CHECKOUT_FAILED" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  }

  return NextResponse.json({ error: "Invalid checkout type.", code: "INVALID_TYPE" }, { status: 400 });
}
