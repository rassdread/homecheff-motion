/**
 * Credit authorization flow: evaluate → reserve → (execute) → capture/refund.
 * No provider call should happen before successful reservation.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureStudioAccount } from "@/server/studio-account/ensure-studio-account";
import { evaluateCreditPolicy } from "@/server/studio-account/studio-credit-policy";
import { resolveActionCreditCost } from "@/server/studio-account/studio-pricing-rule-service";
import { getActionCost } from "@/server/studio-account/studio-action-cost-registry";
import {
  captureStudioCredits,
  ensureStudioWallet,
  refundStudioReservation,
  reserveStudioCredits,
} from "@/server/studio-account/studio-wallet-service";
import type { StudioActionType } from "@/server/studio-account/studio-action-cost-registry";
import type { SessionUser } from "@/server/auth/session";
import {
  captureCentralHc,
  getCentralHcWallet,
  isHcCentralAdapterReady,
  releaseCentralHc,
  reserveCentralHc,
  resolveAuthoritativeHcForAction,
} from "@/server/studio-account/hc-central-adapter";
import {
  isStudioCentralHcSpendEnabled,
  studioActionToCentralHcAction,
} from "@/server/studio-account/studio-central-hc-spend-policy";

export type CreditAuthorizationPreview = {
  allowed: boolean;
  requiredCredits: number;
  confirmationRequired: boolean;
  reason: string | null;
  balanceAfter: number;
  upgradeSuggestion: string | null;
  actionType: string;
};

async function buildPolicyEvaluation(input: {
  user: Pick<SessionUser, "id" | "email" | "role">;
  actionType: StudioActionType | string;
  overrideCredits?: number;
}) {
  const account = await ensureStudioAccount(input.user.id, input.user.email);
  const wallet = await ensureStudioWallet(input.user.id);

  let balance = wallet.balance;
  let reservedBalance = wallet.reservedBalance;
  if (isStudioCentralHcSpendEnabled() && isHcCentralAdapterReady()) {
    const userRow = await prisma.user.findUnique({
      where: { id: input.user.id },
      select: { centralUserId: true },
    });
    const centralUserId = userRow?.centralUserId?.trim() || null;
    if (centralUserId) {
      try {
        const central = await getCentralHcWallet(centralUserId);
        balance = Number(central.availableHc ?? 0);
        reservedBalance = Number(central.reservedHc ?? 0);
      } catch {
        // Fail closed to local wallet if central read fails (auth will still require central reserve).
      }
    }
  }

  const dbRule = await prisma.studioPricingRule.findUnique({
    where: { actionType: input.actionType },
  });
  if (dbRule && !dbRule.active) {
    const registry = getActionCost(input.actionType);
    const policy = evaluateCreditPolicy({
      userId: input.user.id,
      role: input.user.role,
      accountType: account.accountType,
      planId: account.studioPlan,
      planVersion: account.planVersion,
      creditPolicyVersion: account.creditPolicyVersion,
      billingStatus: account.billingStatus,
      actionType: input.actionType,
      overrideCredits: input.overrideCredits,
      resolvedCreditCost: undefined,
      resolvedReservedCostUsd: registry?.reservedCostUsd,
      resolvedService: registry?.service,
      resolvedProvider: registry?.provider,
      balance,
      reservedBalance,
      autoChargeSmallActions: account.autoChargeSmallActions,
      confirmAboveCredits: account.confirmAboveCredits,
    });
    return {
      account,
      wallet,
      policy: {
        ...policy,
        allowed: false,
        reason: "action_disabled",
      },
    };
  }

  const resolved = await resolveActionCreditCost({
    actionType: input.actionType,
    planId: account.studioPlan,
    overrideCredits: input.overrideCredits,
  });
  const registry = getActionCost(input.actionType);

  // When central spend is on, authoritative HC cost comes from Growth catalog (80 video / 8 vision).
  const hcAction = studioActionToCentralHcAction(String(input.actionType));
  let resolvedCreditCost = resolved?.creditCost;
  if (isStudioCentralHcSpendEnabled() && isHcCentralAdapterReady() && hcAction) {
    const catalogHc = resolveAuthoritativeHcForAction(hcAction);
    if (catalogHc != null) resolvedCreditCost = catalogHc;
  }

  const policy = evaluateCreditPolicy({
    userId: input.user.id,
    role: input.user.role,
    accountType: account.accountType,
    planId: account.studioPlan,
    planVersion: account.planVersion,
    creditPolicyVersion: account.creditPolicyVersion,
    billingStatus: account.billingStatus,
    actionType: input.actionType,
    overrideCredits: input.overrideCredits,
    resolvedCreditCost,
    resolvedReservedCostUsd: resolved?.reservedCostUsd,
    resolvedService: registry?.service,
    resolvedProvider: registry?.provider,
    balance,
    reservedBalance,
    autoChargeSmallActions: account.autoChargeSmallActions,
    confirmAboveCredits: account.confirmAboveCredits,
  });

  return { account, wallet, policy };
}

export async function previewStudioCreditAuthorization(input: {
  user: Pick<SessionUser, "id" | "email" | "role">;
  actionType: StudioActionType | string;
  projectId?: string;
  overrideCredits?: number;
}): Promise<CreditAuthorizationPreview> {
  const { policy } = await buildPolicyEvaluation(input);

  return {
    allowed: policy.allowed,
    requiredCredits: policy.requiredCredits,
    confirmationRequired: policy.confirmationRequired,
    reason: policy.reason,
    balanceAfter: policy.balanceAfter,
    upgradeSuggestion: policy.upgradeSuggestion,
    actionType: policy.actionType,
  };
}

export type CreditReservation = {
  reservationId: string;
  requiredCredits: number;
  service: string;
  provider: string;
  reservedCostUsd: number;
  marginEstimate: number;
};

export async function authorizeStudioAction(input: {
  user: Pick<SessionUser, "id" | "email" | "role">;
  actionType: StudioActionType | string;
  projectId?: string;
  confirmed?: boolean;
  overrideCredits?: number;
  metadataJson?: Record<string, unknown>;
}): Promise<
  | { ok: true; reservation: CreditReservation; adminBypass?: boolean }
  | { ok: false; code: string; message: string; preview: CreditAuthorizationPreview }
> {
  const { policy } = await buildPolicyEvaluation(input);

  const preview: CreditAuthorizationPreview = {
    allowed: policy.allowed,
    requiredCredits: policy.requiredCredits,
    confirmationRequired: policy.confirmationRequired,
    reason: policy.reason,
    balanceAfter: policy.balanceAfter,
    upgradeSuggestion: policy.upgradeSuggestion,
    actionType: policy.actionType,
  };

  if (!policy.allowed) {
    return {
      ok: false,
      code: policy.reason ?? "not_allowed",
      message: creditDenialMessage(policy.reason),
      preview,
    };
  }

  if (input.user.role === "admin" || policy.reason === "admin_bypass") {
    return {
      ok: true,
      adminBypass: true,
      reservation: {
        reservationId: "admin-bypass",
        requiredCredits: 0,
        service: policy.service,
        provider: policy.provider,
        reservedCostUsd: 0,
        marginEstimate: 0,
      },
    };
  }

  if (policy.confirmationRequired && !input.confirmed) {
    return {
      ok: false,
      code: "confirmation_required",
      message: "Confirmation required for this action.",
      preview,
    };
  }

  try {
    const hcAction = studioActionToCentralHcAction(String(policy.actionType));
    const useCentralHc =
      isStudioCentralHcSpendEnabled() &&
      isHcCentralAdapterReady() &&
      hcAction != null;

    if (useCentralHc) {
      const userRow = await prisma.user.findUnique({
        where: { id: input.user.id },
        select: { centralUserId: true },
      });
      const centralUserId = userRow?.centralUserId?.trim() || null;
      if (!centralUserId) {
        return {
          ok: false,
          code: "central_identity_required",
          message: "Central identity required for Studio HC spend.",
          preview,
        };
      }

      const idempotencyKey = `studio-hc-reserve:${input.user.id}:${hcAction}:${input.projectId ?? "none"}:${Date.now()}`;
      const reserved = await reserveCentralHc({
        centralUserId,
        action: hcAction,
        operation: "STUDIO_ACTION",
        provider: policy.provider,
        jobId: input.projectId,
        idempotencyKey,
        legacyStudioCredits: policy.requiredCredits,
      });
      const reservationId =
        reserved && typeof reserved === "object" && "reservationId" in reserved
          ? String((reserved as { reservationId: string }).reservationId)
          : null;
      if (!reservationId) {
        return {
          ok: false,
          code: "reservation_failed",
          message: "Central HC reservation missing id",
          preview,
        };
      }

      return {
        ok: true,
        reservation: {
          reservationId: `central-hc:${centralUserId}:${reservationId}`,
          requiredCredits: policy.requiredCredits,
          service: policy.service,
          provider: policy.provider,
          reservedCostUsd: policy.reservedCostUsd,
          marginEstimate: policy.marginEstimateUsd,
        },
      };
    }

    const { reservationId } = await reserveStudioCredits({
      userId: input.user.id,
      credits: policy.requiredCredits,
      service: policy.service,
      provider: policy.provider,
      projectId: input.projectId,
      reservedCostUsd: policy.reservedCostUsd,
      marginEstimate: policy.marginEstimateUsd,
      metadataJson: {
        actionType: policy.actionType,
        ...input.metadataJson,
      },
    });

    return {
      ok: true,
      reservation: {
        reservationId,
        requiredCredits: policy.requiredCredits,
        service: policy.service,
        provider: policy.provider,
        reservedCostUsd: policy.reservedCostUsd,
        marginEstimate: policy.marginEstimateUsd,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reservation failed";
    return {
      ok: false,
      code:
        message === "INSUFFICIENT_CREDITS" || message.includes("INSUFFICIENT")
          ? "insufficient_credits"
          : "reservation_failed",
      message,
      preview,
    };
  }
}

function parseCentralHcReservation(reservationId: string): {
  centralUserId: string;
  reservationId: string;
} | null {
  if (!reservationId.startsWith("central-hc:")) return null;
  const parts = reservationId.split(":");
  if (parts.length < 3) return null;
  return { centralUserId: parts[1]!, reservationId: parts.slice(2).join(":") };
}

export async function captureStudioActionReservation(input: {
  userId: string;
  reservation: CreditReservation;
  projectId?: string;
  providerCostUsd?: number;
  providerCostEventId?: string;
  metadataJson?: Record<string, unknown>;
}): Promise<void> {
  if (input.reservation.reservationId === "admin-bypass") {
    return;
  }
  if (input.reservation.requiredCredits <= 0) {
    return;
  }

  const central = parseCentralHcReservation(input.reservation.reservationId);
  if (central) {
    await captureCentralHc({
      centralUserId: central.centralUserId,
      reservationId: central.reservationId,
      idempotencyKey: `studio-hc-capture:${central.reservationId}`,
    });
    return;
  }

  await captureStudioCredits({
    userId: input.userId,
    credits: input.reservation.requiredCredits,
    reservationId: input.reservation.reservationId,
    service: input.reservation.service,
    provider: input.reservation.provider,
    projectId: input.projectId,
    providerCostUsd: input.providerCostUsd,
    reservedCostUsd: input.reservation.reservedCostUsd,
    marginEstimate: input.reservation.marginEstimate,
    metadataJson: {
      ...input.metadataJson,
      providerCostEventId: input.providerCostEventId,
    },
  });
}

export async function refundStudioActionReservation(input: {
  userId: string;
  reservation: CreditReservation;
  projectId?: string;
  failedGeneration?: boolean;
  metadataJson?: Record<string, unknown>;
}): Promise<void> {
  if (input.reservation.reservationId === "admin-bypass") {
    return;
  }
  if (input.reservation.requiredCredits <= 0) {
    return;
  }

  const central = parseCentralHcReservation(input.reservation.reservationId);
  if (central) {
    await releaseCentralHc({
      centralUserId: central.centralUserId,
      reservationId: central.reservationId,
      idempotencyKey: `studio-hc-release:${central.reservationId}`,
    });
    return;
  }

  await refundStudioReservation({
    userId: input.userId,
    credits: input.reservation.requiredCredits,
    reservationId: input.reservation.reservationId,
    service: input.reservation.service,
    provider: input.reservation.provider,
    projectId: input.projectId,
    failedGeneration: input.failedGeneration,
    metadataJson: input.metadataJson,
  });
}

export function creditDenialMessage(code: string | null): string {
  switch (code) {
    case "free_account_provider_action":
      return "Voor AI-functies heb je credits nodig. Koop credits of start een abonnement.";
    case "insufficient_credits":
      return "Onvoldoende Studio Credits.";
    case "confirmation_required":
      return "Bevestiging vereist voor deze actie.";
    default:
      return "Deze actie is niet toegestaan.";
  }
}

export function studioCreditDeniedResponse(
  code: string,
  message: string,
  preview?: CreditAuthorizationPreview
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code,
      creditGate: true,
      preview,
    },
    { status: code === "confirmation_required" ? 402 : 403 }
  );
}

/** Helper for API routes — returns NextResponse if blocked, null if authorized. */
export async function gateStudioAction(input: {
  user: Pick<SessionUser, "id" | "email" | "role">;
  actionType: StudioActionType | string;
  projectId?: string;
  confirmed?: boolean;
  overrideCredits?: number;
}): Promise<
  | { blocked: NextResponse }
  | { authorized: true; reservation: CreditReservation; adminBypass?: boolean }
> {
  const result = await authorizeStudioAction(input);
  if (!result.ok) {
    return {
      blocked: studioCreditDeniedResponse(result.code, result.message, result.preview),
    };
  }
  return {
    authorized: true,
    reservation: result.reservation,
    adminBypass: result.adminBypass,
  };
}

/** Map action types to routes for integration tests. */
export const ACTION_TYPE_ROUTE_MAP: Record<string, string[]> = {
  ai_analysis: ["/api/studio/storyboards/[id]/analyze-vision"],
  scene_generation: ["/api/studio/storyboards/[id]/scenes/[sceneId]/images"],
  motion_render: ["/api/instant-premium/create-and-generate", "/api/animations/projects"],
  image_generation: ["/api/editor/instruction/variant"],
  fusion_render: ["/api/editor/instruction/variant"],
  publish_mp4_export: ["/api/publish/export"],
};

export async function verifyLedgerMatchesWallet(userId: string): Promise<{
  ok: boolean;
  walletBalance: number;
  ledgerNet: number;
}> {
  const wallet = await prisma.studioWallet.findUnique({ where: { userId } });
  if (!wallet) {
    return { ok: true, walletBalance: 0, ledgerNet: 0 };
  }

  const entries = await prisma.studioLedgerEntry.findMany({
    where: { userId },
    select: { creditsDelta: true, actionType: true, metadataJson: true },
  });

  let net = 0;
  for (const e of entries) {
    if (e.actionType === "usage_reservation" || e.actionType === "usage_refund") {
      continue;
    }
    net += e.creditsDelta;
  }

  return {
    ok: net === wallet.balance,
    walletBalance: wallet.balance,
    ledgerNet: net,
  };
}
