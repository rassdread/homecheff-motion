import { NextResponse } from "next/server";
import { estimateInstantPremiumPriceCents, formatInstantPremiumPriceEur } from "@/lib/instant-premium-pricing";
import { getPublicOrigin } from "@/lib/public-origin";
import { assertStripeSecretKeyConfigured, getStripeClient } from "@/lib/stripe-server";
import { getInstantPremiumMode } from "@/lib/instant-premium-mode";
import { prisma } from "@/lib/prisma";
import {
  validateInstantPremiumCreatePayload,
} from "@/server/instant-premium/create-instant-premium-project";
import {
  instantPreflightHttpStatus,
  runInstantPremiumTextPreflight,
} from "@/server/instant-premium/instant-premium-preflight";
import { guardInstantPremiumVideoRendering } from "@/server/instant-premium/video-rendering-guard";
import { requireActiveUser } from "@/server/auth/permissions";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  if (user.role === "admin") {
    return NextResponse.json(
      {
        error: "Admins use test-mode generation without checkout.",
        code: "ADMIN_FREE_GENERATION",
      },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validated = validateInstantPremiumCreatePayload(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: validated.status });
  }

  const mode = getInstantPremiumMode();
  if (mode === "test") {
    return NextResponse.json(
      {
        error:
          "Checkout is disabled in test mode. Use /api/instant-premium/create-and-generate.",
      },
      { status: 409 }
    );
  }

  const renderingGuard = await guardInstantPremiumVideoRendering(validated.data);
  if (!renderingGuard.ok) {
    return NextResponse.json(
      { error: renderingGuard.error, code: renderingGuard.code },
      { status: renderingGuard.status }
    );
  }

  const preflight = await runInstantPremiumTextPreflight(validated.data);
  if (!preflight.ok) {
    return NextResponse.json(
      {
        error: preflight.blockMessage,
        code: preflight.code,
        blockMessage: preflight.blockMessage,
        warnings: preflight.warnings,
      },
      { status: instantPreflightHttpStatus(preflight) }
    );
  }

  try {
    assertStripeSecretKeyConfigured();
  } catch {
    return NextResponse.json({ error: "Payment is temporarily unavailable." }, { status: 503 });
  }


  const stripe = getStripeClient();
  const origin = getPublicOrigin();
  const imageCount = validated.data.images.length;
  const priceOptions = {
    durationSeconds: validated.data.duration,
    transitionSeconds: validated.data.instantTransitionSeconds,
  };
  const amountCents = estimateInstantPremiumPriceCents(imageCount, priceOptions);
  const priceLabel = formatInstantPremiumPriceEur(imageCount, "en", priceOptions);
  const modeLabel = validated.data.instantMode === "story" ? "Story" : "Transition";
  const label = `HomeCheff Motion — ${modeLabel} (${imageCount} images, ${validated.data.duration}s, ${priceLabel})`;

  const pending = await prisma.instantPremiumPendingOrder.create({
    data: {
      ownerId: user.id,
      payload: validated.data as object,
      status: "pending_payment",
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: label,
            description: "One-time premium multi-image video generation",
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/animate/instant/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/animate/instant?canceled=1`,
    client_reference_id: pending.id,
    metadata: {
      pendingOrderId: pending.id,
      ownerId: user.id,
    },
  });

  if (!session.url) {
    await prisma.instantPremiumPendingOrder
      .delete({ where: { id: pending.id } })
      .catch(() => undefined);
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
  }

  await prisma.instantPremiumPendingOrder.update({
    where: { id: pending.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  console.info("[hc-instant-premium]", {
    mode,
    action: "stripe_checkout",
    projectId: null,
    jobTriggered: false,
  });

  return NextResponse.json(
    { url: session.url, pendingOrderId: pending.id, sessionId: session.id },
    { status: 200 }
  );
}
