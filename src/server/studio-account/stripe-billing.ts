/**
 * Stripe billing preparation — checkout only when Stripe price IDs are configured.
 */

import { prisma } from "@/lib/prisma";
import { getStripeClient, assertStripeSecretKeyConfigured } from "@/lib/stripe-server";
import { ensureStudioAccount } from "@/server/studio-account/ensure-studio-account";
import {
  getCreditPack,
  resolveCreditPackStripePriceId,
} from "@/server/studio-account/studio-credit-packs";
import {
  getStudioPlan,
  resolveStripePriceId,
  type StudioPlanId,
} from "@/server/studio-account/studio-plan-config";
import { grantStudioCredits } from "@/server/studio-account/studio-wallet-service";
import { updateStudioAccountPlan } from "@/server/studio-account/ensure-studio-account";
import { applySubscriptionCancellationPolicy } from "@/server/studio-account/studio-credit-policy";
import type Stripe from "stripe";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function isStripeCheckoutAvailable(): boolean {
  if (!isStripeConfigured()) {
    return false;
  }
  const hasPlan =
    resolveStripePriceId("creator") ||
    resolveStripePriceId("pro") ||
    resolveStripePriceId("studio");
  const hasPack = resolveCreditPackStripePriceId("pack_500");
  return Boolean(hasPlan || hasPack);
}

async function ensureStripeCustomer(userId: string, email: string): Promise<string> {
  const account = await ensureStudioAccount(userId, email);
  if (account.stripeCustomerId) {
    return account.stripeCustomerId;
  }

  assertStripeSecretKeyConfigured();
  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  await prisma.studioAccount.update({
    where: { userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createSubscriptionCheckout(input: {
  userId: string;
  email: string;
  planId: StudioPlanId;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; url: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe is not configured." };
  }

  const priceId = resolveStripePriceId(input.planId);
  if (!priceId) {
    return { error: `Stripe price not configured for plan ${input.planId}.` };
  }

  const customerId = await ensureStripeCustomer(input.userId, input.email);
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      userId: input.userId,
      planId: input.planId,
      type: "subscription",
    },
  });

  if (!session.url) {
    return { error: "Failed to create checkout session." };
  }

  return { sessionId: session.id, url: session.url };
}

export async function createCreditPackCheckout(input: {
  userId: string;
  email: string;
  packId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; url: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe is not configured." };
  }

  const pack = getCreditPack(input.packId);
  if (!pack) {
    return { error: "Unknown credit pack." };
  }

  const priceId = resolveCreditPackStripePriceId(input.packId);
  if (!priceId) {
    return { error: `Stripe price not configured for pack ${input.packId}.` };
  }

  const customerId = await ensureStripeCustomer(input.userId, input.email);
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      userId: input.userId,
      packId: input.packId,
      credits: String(pack.credits),
      type: "credit_pack",
    },
  });

  if (!session.url) {
    return { error: "Failed to create checkout session." };
  }

  return { sessionId: session.id, url: session.url };
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      break;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  const type = session.metadata?.type;
  if (!userId) return;

  if (type === "credit_pack") {
    const credits = Number(session.metadata?.credits ?? 0);
    if (credits > 0) {
      await grantStudioCredits({
        userId,
        credits,
        actionType: "credit_purchase",
        service: "billing",
        metadataJson: {
          stripeSessionId: session.id,
          packId: session.metadata?.packId,
        },
        lifetimeField: "lifetimePurchased",
      });
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
    if (!customerId) return;
    const account = await prisma.studioAccount.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!account) return;
    await syncSubscriptionToAccount(account.userId, subscription);
    return;
  }
  await syncSubscriptionToAccount(userId, subscription);
}

async function syncSubscriptionToAccount(userId: string, subscription: Stripe.Subscription): Promise<void> {
  const planId = (subscription.metadata?.planId as StudioPlanId) ?? "creator";
  const priceId = subscription.items.data[0]?.price?.id ?? null;

  await updateStudioAccountPlan({
    userId,
    planId,
    billingStatus: subscription.status === "active" ? "active" : "past_due",
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId ?? undefined,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!customerId) return;

  const account = await prisma.studioAccount.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!account) return;

  const policy = applySubscriptionCancellationPolicy({
    creditPolicyVersion: account.creditPolicyVersion,
  });

  await prisma.studioAccount.update({
    where: { userId: account.userId },
    data: {
      billingStatus: policy.billingStatus,
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
      accountType: "free",
      studioPlan: "free",
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.subscription) return;

  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const account = await prisma.studioAccount.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!account) return;

  const plan = getStudioPlan(account.studioPlan);
  if (plan.monthlyCredits <= 0) return;

  await grantStudioCredits({
    userId: account.userId,
    credits: plan.monthlyCredits,
    actionType: "subscription_grant",
    service: "billing",
    metadataJson: {
      stripeInvoiceId: invoice.id,
      planId: plan.id,
    },
    lifetimeField: "lifetimeGranted",
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  await prisma.studioAccount.updateMany({
    where: { stripeCustomerId: customerId },
    data: { billingStatus: "past_due" },
  });
}
