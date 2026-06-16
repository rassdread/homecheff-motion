/**
 * Central credit policy engine — decides if an action is allowed and at what cost.
 */

import {
  getActionCost,
  estimateMarginUsd,
  type StudioActionType,
} from "@/server/studio-account/studio-action-cost-registry";
import type { StudioAccountType } from "@/types/studio-account";

export type CreditPolicyInput = {
  userId: string;
  role?: string;
  accountType: StudioAccountType;
  planId?: string;
  planVersion: string;
  creditPolicyVersion: string;
  billingStatus: string;
  actionType: StudioActionType | string;
  estimatedProviderCostUsd?: number;
  overrideCredits?: number;
  resolvedCreditCost?: number;
  resolvedReservedCostUsd?: number;
  resolvedService?: string;
  resolvedProvider?: string;
  requestedOptions?: Record<string, unknown>;
  balance: number;
  reservedBalance: number;
  autoChargeSmallActions: boolean;
  confirmAboveCredits: number;
};

export type CreditPolicyResult = {
  allowed: boolean;
  requiredCredits: number;
  confirmationRequired: boolean;
  reason: string | null;
  balanceAfter: number;
  upgradeSuggestion: StudioAccountType | null;
  reservedCostUsd: number;
  marginEstimateUsd: number;
  actionType: string;
  service: string;
  provider: string;
};

export function evaluateCreditPolicy(input: CreditPolicyInput): CreditPolicyResult {
  const action = getActionCost(input.actionType);
  if (!action && input.resolvedCreditCost == null) {
    return denied(input, 0, "unknown_action", null, "Unknown action type.");
  }

  if (input.role === "admin") {
    return allowed(
      input,
      0,
      {
        actionType: input.actionType,
        reservedCostUsd: input.resolvedReservedCostUsd ?? action?.reservedCostUsd ?? 0,
        service: input.resolvedService ?? action?.service ?? "studio",
        provider: input.resolvedProvider ?? action?.provider ?? "internal",
      },
      "admin_bypass"
    );
  }

  const available = Math.max(0, input.balance - input.reservedBalance);
  const requiredCredits =
    input.resolvedCreditCost ??
    input.overrideCredits ??
    action?.defaultCreditCost ??
    0;
  const reservedCostUsd = input.resolvedReservedCostUsd ?? action?.reservedCostUsd ?? 0;
  const service = input.resolvedService ?? action?.service ?? "studio";
  const provider = input.resolvedProvider ?? action?.provider ?? "internal";

  if (
    input.accountType === "free" &&
    (action?.requiresProviderCost ?? true) &&
    available < requiredCredits
  ) {
    return {
      allowed: false,
      requiredCredits,
      confirmationRequired: false,
      reason: "free_account_provider_action",
      balanceAfter: available,
      upgradeSuggestion: "creator",
      reservedCostUsd,
      marginEstimateUsd: estimateMarginUsd(reservedCostUsd, requiredCredits),
      actionType: input.actionType,
      service,
      provider,
    };
  }

  if (available < requiredCredits) {
    return {
      allowed: false,
      requiredCredits,
      confirmationRequired: false,
      reason: "insufficient_credits",
      balanceAfter: available,
      upgradeSuggestion: suggestUpgrade(input.accountType),
      reservedCostUsd,
      marginEstimateUsd: estimateMarginUsd(reservedCostUsd, requiredCredits),
      actionType: input.actionType,
      service,
      provider,
    };
  }

  const confirmationRequired =
    requiredCredits >= input.confirmAboveCredits ||
    (!input.autoChargeSmallActions && requiredCredits >= 1);

  return {
    allowed: true,
    requiredCredits,
    confirmationRequired,
    reason: null,
    balanceAfter: available - requiredCredits,
    upgradeSuggestion: null,
    reservedCostUsd,
    marginEstimateUsd: estimateMarginUsd(reservedCostUsd, requiredCredits),
    actionType: input.actionType,
    service,
    provider,
  };
}

function suggestUpgrade(accountType: StudioAccountType): StudioAccountType | null {
  if (accountType === "free") return "creator";
  if (accountType === "creator") return "pro";
  if (accountType === "pro") return "studio";
  return null;
}

function allowed(
  input: CreditPolicyInput,
  requiredCredits: number,
  action: {
    actionType: string;
    reservedCostUsd: number;
    service: string;
    provider: string;
  },
  reason: string
): CreditPolicyResult {
  const available = Math.max(0, input.balance - input.reservedBalance);
  return {
    allowed: true,
    requiredCredits,
    confirmationRequired: false,
    reason,
    balanceAfter: available - requiredCredits,
    upgradeSuggestion: null,
    reservedCostUsd: action.reservedCostUsd,
    marginEstimateUsd: estimateMarginUsd(action.reservedCostUsd, requiredCredits),
    actionType: action.actionType,
    service: action.service,
    provider: action.provider,
  };
}

function denied(
  input: CreditPolicyInput,
  requiredCredits: number,
  actionType: string,
  service: string | null,
  reason: string
): CreditPolicyResult {
  const available = Math.max(0, input.balance - input.reservedBalance);
  return {
    allowed: false,
    requiredCredits,
    confirmationRequired: false,
    reason,
    balanceAfter: available,
    upgradeSuggestion: "creator",
    reservedCostUsd: 0,
    marginEstimateUsd: 0,
    actionType,
    service: service ?? "unknown",
    provider: "unknown",
  };
}

/** Credits never expire on cancellation by default — account moves to prepaid. */
export function applySubscriptionCancellationPolicy(input: {
  creditPolicyVersion: string;
}): { billingStatus: "prepaid"; retainCredits: true } {
  void input;
  return { billingStatus: "prepaid", retainCredits: true };
}
