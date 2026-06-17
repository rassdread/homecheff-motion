/**
 * Stripe billing preparation — checkout only when Stripe price IDs are configured.
 */

import { prisma } from "@/lib/prisma";
import { getStripeClient, assertStripeSecretKeyConfigured } from "@/lib/stripe-server";
import { ensureStudioAccount } from "@/server/studio-account/ensure-studio-account";
import {
  getStudioCreditPackBySlug,
  totalPackCredits,
  resolvePackStripePriceId,
} from "@/server/studio-account/studio-credit-pack-service";
import {
  getStudioSubscriptionPlanBySlug,
  resolvePlanStripePriceId,
} from "@/server/studio-account/studio-subscription-plan-service";
import { type StudioPlanId } from "@/server/studio-account/studio-plan-config";
import type { SubscriptionBillingInterval } from "@/lib/studio-subscription-billing";
import {
  applyPostCheckoutPromoBenefits,
  validatePromoCode,
} from "@/server/studio-account/studio-promo-code-service";
import { grantStudioCredits } from "@/server/studio-account/studio-wallet-service";
import { updateStudioAccountPlan } from "@/server/studio-account/ensure-studio-account";
import { applySubscriptionCancellationPolicy } from "@/server/studio-account/studio-credit-policy";
import type Stripe from "stripe";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export async function isStripeCheckoutAvailable(): Promise<boolean> {
  if (!isStripeConfigured()) {
    return false;
  }
  const plans = await getStudioSubscriptionPlanBySlug("creator");
  const packs = await getStudioCreditPackBySlug("pack_500");
  const hasPlan = plans ? resolvePlanStripePriceId(plans) : null;
  const hasPack = packs ? resolvePackStripePriceId(packs) : null;
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
  billingInterval?: SubscriptionBillingInterval;
  successUrl: string;
  cancelUrl: string;
  promoCode?: string;
  locale?: "nl" | "en";
}): Promise<{ sessionId: string; url: string; promoPreview?: unknown } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe is not configured." };
  }

  const plan = await getStudioSubscriptionPlanBySlug(input.planId);
  if (!plan || !plan.isActive) {
    return { error: `Unknown or inactive plan ${input.planId}.` };
  }

  const billingInterval: SubscriptionBillingInterval = input.billingInterval ?? "monthly";
  const basePrice =
    billingInterval === "yearly"
      ? (plan.yearlyPriceEur ?? 0)
      : (plan.monthlyPriceEur ?? 0);
  let promoPreview;
  let adjustedPrice = basePrice;

  if (input.promoCode) {
    const validation = await validatePromoCode({
      code: input.promoCode,
      userId: input.userId,
      checkoutType: "subscription",
      planSlug: plan.slug,
      basePriceEur: basePrice,
      locale: input.locale,
    });
    if (!validation.valid) {
      return { error: validation.reason ?? "Invalid promo code." };
    }
    promoPreview = validation;
    if (validation.adjustedPriceEur != null) {
      adjustedPrice = validation.adjustedPriceEur;
    } else if (validation.subscriptionDiscountPercent) {
      adjustedPrice = Math.max(0, basePrice * (1 - validation.subscriptionDiscountPercent / 100));
    }
  }

  const priceId = resolvePlanStripePriceId(plan, billingInterval);
  const customerId = await ensureStripeCustomer(input.userId, input.email);
  const stripe = getStripeClient();
  const stripeInterval = billingInterval === "yearly" ? "year" : "month";

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    adjustedPrice < basePrice && adjustedPrice >= 0
      ? [
          {
            price_data: {
              currency: "eur",
              product_data: { name: `${plan.name} subscription (${billingInterval})` },
              unit_amount: Math.round(adjustedPrice * 100),
              recurring: { interval: stripeInterval },
            },
            quantity: 1,
          },
        ]
      : priceId
        ? [{ price: priceId, quantity: 1 }]
        : [];

  if (lineItems.length === 0) {
    return {
      error: `Stripe ${billingInterval} price not configured for plan ${input.planId}.`,
    };
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: lineItems,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      userId: input.userId,
      planId: input.planId,
      billingInterval,
      type: "subscription",
      ...(input.promoCode ? { promoCode: input.promoCode.trim().toUpperCase() } : {}),
    },
  });

  if (!session.url) {
    return { error: "Failed to create checkout session." };
  }

  return { sessionId: session.id, url: session.url, promoPreview };
}

export async function createCreditPackCheckout(input: {
  userId: string;
  email: string;
  packId: string;
  successUrl: string;
  cancelUrl: string;
  promoCode?: string;
  locale?: "nl" | "en";
}): Promise<{ sessionId: string; url: string; promoPreview?: unknown } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe is not configured." };
  }

  const pack = await getStudioCreditPackBySlug(input.packId);
  if (!pack || !pack.active) {
    return { error: "Unknown credit pack." };
  }

  let promoPreview;
  let adjustedPrice = pack.priceEur;
  if (input.promoCode) {
    const validation = await validatePromoCode({
      code: input.promoCode,
      userId: input.userId,
      checkoutType: "credit_pack",
      packSlug: pack.slug,
      basePriceEur: pack.priceEur,
      locale: input.locale,
    });
    if (!validation.valid) {
      return { error: validation.reason ?? "Invalid promo code." };
    }
    promoPreview = validation;
    if (validation.adjustedPriceEur != null) {
      adjustedPrice = validation.adjustedPriceEur;
    }
  }

  const priceId = resolvePackStripePriceId(pack);
  const customerId = await ensureStripeCustomer(input.userId, input.email);
  const stripe = getStripeClient();
  const totalCredits = totalPackCredits(pack);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    adjustedPrice < pack.priceEur
      ? [
          {
            price_data: {
              currency: "eur",
              product_data: { name: pack.name },
              unit_amount: Math.round(adjustedPrice * 100),
            },
            quantity: 1,
          },
        ]
      : priceId
        ? [{ price: priceId, quantity: 1 }]
        : [
            {
              price_data: {
                currency: "eur",
                product_data: { name: pack.name },
                unit_amount: Math.round(pack.priceEur * 100),
              },
              quantity: 1,
            },
          ];

  if (lineItems.length === 0) {
    return { error: `Stripe price not configured for pack ${input.packId}.` };
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: lineItems,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      userId: input.userId,
      packId: pack.slug,
      packSlug: pack.slug,
      credits: String(pack.credits),
      totalCredits: String(totalCredits),
      type: "credit_pack",
      ...(input.promoCode ? { promoCode: input.promoCode.trim().toUpperCase() } : {}),
    },
  });

  if (!session.url) {
    return { error: "Failed to create checkout session." };
  }

  return { sessionId: session.id, url: session.url, promoPreview };
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
    const credits = Number(session.metadata?.totalCredits ?? session.metadata?.credits ?? 0);
    if (credits > 0) {
      await grantStudioCredits({
        userId,
        credits,
        actionType: "credit_purchase",
        creditOrigin: "PURCHASED",
        service: "billing",
        metadataJson: {
          stripeSessionId: session.id,
          packId: session.metadata?.packId,
          packSlug: session.metadata?.packSlug,
        },
        lifetimeField: "lifetimePurchased",
      });
    }
    const promoCode = session.metadata?.promoCode;
    if (promoCode) {
      const pack = await getStudioCreditPackBySlug(session.metadata?.packSlug ?? session.metadata?.packId ?? "");
      await applyPostCheckoutPromoBenefits({
        userId,
        promoCode,
        pack,
        stripeSessionId: session.id,
      });
    }
  }

  if (type === "subscription" && session.metadata?.promoCode) {
    const plan = await getStudioSubscriptionPlanBySlug(session.metadata.planId ?? "");
    await applyPostCheckoutPromoBenefits({
      userId,
      promoCode: session.metadata.promoCode,
      plan,
      stripeSessionId: session.id,
    });
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

  // Phase 4: subscriptions grant benefits (discount, storage, features) — not monthly credits.
  await prisma.studioAccount.update({
    where: { userId: account.userId },
    data: { billingStatus: "active" },
  });
}

export async function createStripeCustomerPortalSession(input: {
  userId: string;
  email: string;
  returnUrl: string;
}): Promise<{ url: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: "Stripe is not configured." };
  }

  const customerId = await ensureStripeCustomer(input.userId, input.email);
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: input.returnUrl,
  });

  if (!session.url) {
    return { error: "Failed to create portal session." };
  }

  return { url: session.url };
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
