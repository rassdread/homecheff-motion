import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe-server";
import { handleStripeWebhookEvent } from "@/server/studio-account/stripe-billing";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured.", code: "WEBHOOK_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature.", code: "MISSING_SIGNATURE" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: message, code: "INVALID_SIGNATURE" }, { status: 400 });
  }

  try {
    await handleStripeWebhookEvent(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    return NextResponse.json({ error: message, code: "HANDLER_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
