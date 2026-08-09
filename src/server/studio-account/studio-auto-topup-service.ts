/**
 * S.8B — Auto Top-Up server service (Billing owns payment execution).
 * Minimum canonical runtime over former CONFIG_ONLY plan flag.
 */

import { prisma } from "@/lib/prisma";
import {
  STUDIO_AUTO_TOPUP_DEFAULTS,
  buildAutoTopUpIdempotencyKey,
  evaluateAutoTopUpTrigger,
  isPlanAutoTopUpEligible,
  utcHourBucket,
  type StudioAutoTopUpSettings,
  type StudioAutoTopUpStatus,
} from "@/lib/studio-auto-topup";
import { getCreditPack, type StudioCreditPackId } from "@/server/studio-account/studio-credit-packs";
import { ensureStudioAccount } from "@/server/studio-account/ensure-studio-account";
import { createCreditPackCheckout } from "@/server/studio-account/stripe-billing";
import { buildFinancialCorrelationId } from "@/lib/studio-financial-ownership";

function mapSettings(account: {
  autoTopUpEnabled: boolean;
  autoTopUpThresholdCredits: number;
  autoTopUpPackSlug: string;
  autoTopUpConsentAt: Date | null;
  autoTopUpStatus: string;
  autoTopUpLastAttemptAt: Date | null;
  autoTopUpLastSuccessAt: Date | null;
  autoTopUpFailureCount: number;
}): StudioAutoTopUpSettings {
  const packId = (getCreditPack(account.autoTopUpPackSlug)?.id ??
    STUDIO_AUTO_TOPUP_DEFAULTS.topUpPackId) as StudioCreditPackId;
  return {
    enabled: account.autoTopUpEnabled,
    thresholdCredits: account.autoTopUpThresholdCredits,
    topUpPackId: packId,
    consentAt: account.autoTopUpConsentAt?.toISOString() ?? null,
    status: (account.autoTopUpStatus as StudioAutoTopUpStatus) || "disabled",
    lastAttemptAt: account.autoTopUpLastAttemptAt?.toISOString() ?? null,
    lastSuccessAt: account.autoTopUpLastSuccessAt?.toISOString() ?? null,
    failureCount: account.autoTopUpFailureCount,
    maxAttemptsPerHour: STUDIO_AUTO_TOPUP_DEFAULTS.maxAttemptsPerHour,
  };
}

export async function getAutoTopUpSettings(
  userId: string,
  email: string
): Promise<{
  settings: StudioAutoTopUpSettings;
  planId: string;
  planEligible: boolean;
}> {
  const account = await ensureStudioAccount(userId, email);
  const row = await prisma.studioAccount.findUniqueOrThrow({ where: { userId } });
  const settings = mapSettings(row);
  return {
    settings,
    planId: account.studioPlan,
    planEligible: isPlanAutoTopUpEligible(account.studioPlan),
  };
}

export async function patchAutoTopUpSettings(
  userId: string,
  email: string,
  patch: {
    enabled?: boolean;
    thresholdCredits?: number;
    topUpPackId?: string;
    consent?: boolean;
  }
): Promise<StudioAutoTopUpSettings> {
  await ensureStudioAccount(userId, email);
  const pack = patch.topUpPackId ? getCreditPack(patch.topUpPackId) : null;
  if (patch.topUpPackId && !pack) {
    throw new Error("INVALID_PACK");
  }

  const enabling = patch.enabled === true;
  if (enabling && patch.consent !== true) {
    throw new Error("CONSENT_REQUIRED");
  }

  const updated = await prisma.studioAccount.update({
    where: { userId },
    data: {
      ...(patch.enabled !== undefined
        ? {
            autoTopUpEnabled: patch.enabled,
            autoTopUpStatus: patch.enabled ? "enabled" : "disabled",
            ...(enabling ? { autoTopUpConsentAt: new Date() } : {}),
          }
        : {}),
      ...(patch.thresholdCredits !== undefined
        ? { autoTopUpThresholdCredits: Math.max(0, Math.floor(patch.thresholdCredits)) }
        : {}),
      ...(pack ? { autoTopUpPackSlug: pack.id } : {}),
    },
  });

  return mapSettings(updated);
}

/**
 * Attempt Auto Top-Up when generation needs credits.
 * Uses the same createCreditPackCheckout path as manual packs (price parity).
 * Idempotent per user+pack+UTC hour.
 */
export async function attemptAutoTopUpForInsufficientCredits(input: {
  userId: string;
  email: string;
  requiredCredits: number;
  availableCredits: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<
  | {
      ok: true;
      status: "checkout_created" | "already_pending" | "duplicate_prevented";
      checkoutUrl?: string | null;
      attemptId: string;
      idempotencyKey: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
    }
> {
  const { settings, planId, planEligible } = await getAutoTopUpSettings(
    input.userId,
    input.email
  );
  const evalResult = evaluateAutoTopUpTrigger({
    settings,
    planId,
    availableCredits: input.availableCredits,
    requiredCredits: input.requiredCredits,
    hasPaymentMethod: true,
  });

  if (!planEligible) {
    return {
      ok: false,
      code: "AUTO_TOPUP_PLAN_INELIGIBLE",
      message: "Auto Top-Up requires an eligible paid plan.",
    };
  }
  if (evalResult.reason === "disabled" || evalResult.reason === "consent_missing") {
    return {
      ok: false,
      code: "AUTO_TOPUP_REQUIRED",
      message: "Enable Auto Top-Up with explicit consent to purchase a credit pack automatically.",
    };
  }
  if (evalResult.reason === "balance_sufficient") {
    return { ok: false, code: "BALANCE_SUFFICIENT", message: "Credits already available." };
  }
  if (evalResult.reason === "pack_invalid") {
    return { ok: false, code: "INVALID_PACK", message: "Configured Auto Top-Up pack is invalid." };
  }

  const pack = getCreditPack(settings.topUpPackId);
  if (!pack) {
    return { ok: false, code: "INVALID_PACK", message: "Pack not found." };
  }

  const hour = utcHourBucket();
  const idempotencyKey = buildAutoTopUpIdempotencyKey({
    userId: input.userId,
    packId: pack.id,
    windowHourIso: hour,
  });
  const correlationId = buildFinancialCorrelationId({
    ownerId: input.userId,
    actionType: "auto_topup",
    stripeObjectId: idempotencyKey,
  });

  const existing = await prisma.studioAutoTopUpAttempt.findUnique({
    where: { userId_idempotencyKey: { userId: input.userId, idempotencyKey } },
  });
  if (existing && existing.status !== "failed") {
    return {
      ok: true,
      status: existing.status === "succeeded" ? "duplicate_prevented" : "already_pending",
      checkoutUrl: null,
      attemptId: existing.id,
      idempotencyKey,
    };
  }
  if (existing?.status === "failed") {
    await prisma.studioAutoTopUpAttempt.delete({ where: { id: existing.id } });
  }

  const recentCount = await prisma.studioAutoTopUpAttempt.count({
    where: {
      userId: input.userId,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recentCount >= settings.maxAttemptsPerHour) {
    return {
      ok: false,
      code: "AUTO_TOPUP_RATE_LIMIT",
      message: "Too many Auto Top-Up attempts this hour. Try a manual pack purchase.",
    };
  }

  const attempt = await prisma.studioAutoTopUpAttempt.create({
    data: {
      userId: input.userId,
      idempotencyKey,
      packSlug: pack.id,
      status: "pending",
      financialCorrelationId: correlationId,
    },
  });

  await prisma.studioAccount.update({
    where: { userId: input.userId },
    data: {
      autoTopUpLastAttemptAt: new Date(),
      autoTopUpStatus: "pending_payment",
    },
  });

  const checkout = await createCreditPackCheckout({
    userId: input.userId,
    email: input.email,
    packId: pack.id,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
  });

  if ("error" in checkout) {
    await prisma.studioAutoTopUpAttempt.update({
      where: { id: attempt.id },
      data: { status: "failed", failureCode: "CHECKOUT_FAILED" },
    });
    await prisma.studioAccount.update({
      where: { userId: input.userId },
      data: {
        autoTopUpFailureCount: { increment: 1 },
        autoTopUpStatus: "failed",
      },
    });
    return { ok: false, code: "AUTO_TOPUP_FAILED", message: checkout.error };
  }

  await prisma.studioAutoTopUpAttempt.update({
    where: { id: attempt.id },
    data: {
      stripeCheckoutSessionId: checkout.sessionId,
      status: "pending",
    },
  });

  return {
    ok: true,
    status: "checkout_created",
    checkoutUrl: checkout.url,
    attemptId: attempt.id,
    idempotencyKey,
  };
}
