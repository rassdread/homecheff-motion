import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  createCreditPackCheckout,
  createSubscriptionCheckout,
  isStripeCheckoutAvailable,
} from "@/server/studio-account/stripe-billing";
import { getStudioSubscriptionPlanBySlug } from "@/server/studio-account/studio-subscription-plan-service";
import { getStudioCreditPackBySlug } from "@/server/studio-account/studio-credit-pack-service";
import type { StudioPlanId } from "@/server/studio-account/studio-plan-config";
import { assertStudioNlSelfServiceCheckout } from "@/lib/billing/studio-nl-eligibility";
import {
  isCentralStudioPaidCheckoutEnabled,
  isCentralStudioTechnicalReady,
  useLegacyMotionStripeCheckout,
} from "@/lib/studio-central-billing-flags";
import { createCentralStudioCheckout } from "@/lib/studio-homecheff-hc-fetch";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    type?: string;
    planId?: string;
    packId?: string;
    billingInterval?: string;
    billingCountry?: string;
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

    const billingCountry = (body.billingCountry ?? "NL").trim().toUpperCase();
    const nlGate = assertStudioNlSelfServiceCheckout({ billingCountry });
    if (!nlGate.ok) {
      return NextResponse.json(
        { error: nlGate.message, code: nlGate.code },
        { status: 403 },
      );
    }

    if (isCentralStudioTechnicalReady() && !isCentralStudioPaidCheckoutEnabled()) {
      return NextResponse.json(
        {
          error: "Paid Studio checkout is not available yet.",
          code: "PUBLIC_ACQUISITION_OFF",
        },
        { status: 503 },
      );
    }

    if (isCentralStudioPaidCheckoutEnabled()) {
      const linked = await prisma.user.findUnique({
        where: { id: user.id },
        select: { centralUserId: true },
      });
      const centralUserId = linked?.centralUserId?.trim() ?? "";
      if (!centralUserId) {
        return NextResponse.json(
          { error: "Central identity required.", code: "CENTRAL_USER_REQUIRED" },
          { status: 400 },
        );
      }
      if (planId !== "creator" && planId !== "pro" && planId !== "studio") {
        return NextResponse.json({ error: "Invalid plan.", code: "INVALID_PLAN" }, { status: 400 });
      }
      const central = await createCentralStudioCheckout({
        centralUserId,
        studioUserId: user.id,
        email: user.email,
        planKey: planId,
        billingCountry: nlGate.billingCountry,
        successUrl,
        cancelUrl,
      });
      if (!central.ok || !central.json || !(central.json as { ok?: boolean }).ok) {
        const err = central.json as { code?: string; message?: string };
        return NextResponse.json(
          { error: err.message ?? "Checkout blocked.", code: err.code ?? "CHECKOUT_BLOCKED" },
          { status: central.status === 403 ? 403 : 503 },
        );
      }
      const data = central.json as { checkoutUrl: string; checkoutSessionId: string };
      return NextResponse.json({ ok: true, url: data.checkoutUrl, sessionId: data.checkoutSessionId, central: true });
    }

    if (!useLegacyMotionStripeCheckout()) {
      return NextResponse.json(
        {
          error: "Legacy Studio checkout is retired.",
          code: "LEGACY_STUDIO_CHECKOUT_RETIRED",
        },
        { status: 503 },
      );
    }

    if (!(await isStripeCheckoutAvailable())) {
      return NextResponse.json(
        { error: "Stripe checkout is not configured.", code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 },
      );
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
    return NextResponse.json({ ok: true, ...result, central: false }, { status: 200 });
  }

  if (body.type === "credit_pack") {
    if (!(await isStripeCheckoutAvailable())) {
      return NextResponse.json(
        { error: "Stripe checkout is not configured.", code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }
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
