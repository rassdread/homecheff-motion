import { NextResponse } from "next/server";
import { getInstantPremiumMode } from "@/lib/instant-premium-mode";
import { getStripeClient } from "@/lib/stripe-server";
import { prisma } from "@/lib/prisma";
import {
  createInstantPremiumAnimationProject,
  validateInstantPremiumCreatePayload,
} from "@/server/instant-premium/create-instant-premium-project";
import { requireActiveUser } from "@/server/auth/permissions";
import { startProjectJobs } from "@/server/animation-jobs/service";

const EXPECTED_CENTS: Record<8 | 15, number> = {
  8: 199,
  15: 299,
};

export async function POST(request: Request) {
  if (getInstantPremiumMode() !== "paid") {
    return NextResponse.json(
      { error: "Payment completion is disabled in test mode." },
      { status: 409 }
    );
  }

  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let sessionId: string;
  try {
    const body = (await request.json()) as { sessionId?: unknown };
    if (typeof body.sessionId !== "string" || !body.sessionId.trim()) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }
    sessionId = body.sessionId.trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let stripe;
  try {
    stripe = getStripeClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe is not configured.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (
    session.metadata?.ownerId?.trim() &&
    session.metadata.ownerId.trim() !== user.id
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const order = await prisma.instantPremiumPendingOrder.findFirst({
    where: { stripeCheckoutSessionId: sessionId, ownerId: user.id },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found for this session." }, { status: 404 });
  }

  if (order.projectId) {
    return NextResponse.json({ projectId: order.projectId, alreadyCompleted: true }, { status: 200 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Payment is not completed yet.", paymentStatus: session.payment_status },
      { status: 402 }
    );
  }

  if (
    session.metadata?.pendingOrderId &&
    session.metadata.pendingOrderId !== order.id
  ) {
    return NextResponse.json({ error: "Session metadata does not match order." }, { status: 400 });
  }

  const payloadValidated = validateInstantPremiumCreatePayload(order.payload);
  if (!payloadValidated.ok) {
    return NextResponse.json(
      { error: "Stored order payload is invalid.", detail: payloadValidated.error },
      { status: 500 }
    );
  }

  const duration = payloadValidated.data.duration;
  const expectedCents = EXPECTED_CENTS[duration === 15 ? 15 : 8];
  if (
    typeof session.amount_total === "number" &&
    session.amount_total > 0 &&
    session.amount_total !== expectedCents
  ) {
    return NextResponse.json(
      {
        error: "Paid amount does not match selected duration.",
        expectedCents,
        got: session.amount_total,
      },
      { status: 400 }
    );
  }

  const created = await createInstantPremiumAnimationProject(user.id, payloadValidated.data);
  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: created.status });
  }

  await prisma.instantPremiumPendingOrder.update({
    where: { id: order.id },
    data: {
      projectId: created.projectId,
      status: "paid",
    },
  });

  try {
    await startProjectJobs(created.projectId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Jobs failed to start.";
    return NextResponse.json(
      {
        projectId: created.projectId,
        warning: message,
        jobsStarted: false,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { projectId: created.projectId, jobsStarted: true },
    { status: 200 }
  );
}
