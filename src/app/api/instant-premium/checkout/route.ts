import { NextResponse } from "next/server";
import { getPublicOrigin } from "@/lib/public-origin";
import { assertStripeSecretKeyConfigured, getStripeClient } from "@/lib/stripe-server";
import { prisma } from "@/lib/prisma";
import {
  createInstantPremiumAnimationProject,
  validateInstantPremiumCreatePayload,
} from "@/server/instant-premium/create-instant-premium-project";
import { startProjectJobs } from "@/server/animation-jobs/service";
import { requireActiveUser } from "@/server/auth/permissions";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
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

  const skipPayment = process.env.SKIP_PAYMENT === "true";
  if (skipPayment) {
    const created = await createInstantPremiumAnimationProject(user.id, validated.data);
    if (!created.ok) {
      return NextResponse.json({ error: created.error }, { status: created.status });
    }

    try {
      await startProjectJobs(created.projectId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start jobs.";
      return NextResponse.json(
        { error: message, projectId: created.projectId, skipPayment: true, jobsStarted: false },
        { status: 200 }
      );
    }

    console.info("[hc-instant-video]", {
      phase: "skip_payment_enabled",
      projectId: created.projectId,
    });

    return NextResponse.json(
      { projectId: created.projectId, skipPayment: true, jobsStarted: true },
      { status: 200 }
    );
  }

  try {
    assertStripeSecretKeyConfigured();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe is not configured.";
    return NextResponse.json({ error: message }, { status: 503 });
  }


  const stripe = getStripeClient();
  const origin = getPublicOrigin();
  const amountCents = validated.data.duration === 8 ? 199 : 299;
  const label =
    validated.data.duration === 8
      ? "HomeCheff Motion — Instant Premium (8s)"
      : "HomeCheff Motion — Instant Premium (15s)";

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

  return NextResponse.json(
    { url: session.url, pendingOrderId: pending.id, sessionId: session.id },
    { status: 200 }
  );
}
