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
  planVersion: string;
  creditPolicyVersion: string;
  billingStatus: string;
  actionType: StudioActionType | string;
  estimatedProviderCostUsd?: number;
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
  if (!action) {
    return denied(input, 0, "unknown_action", null, "Unknown action type.");
  }

  if (input.role === "admin") {
    return allowed(input, 0, action, "admin_bypass");
  }

  const available = Math.max(0, input.balance - input.reservedBalance);
  const requiredCredits = action.defaultCreditCost;

  if (input.accountType === "free" && action.requiresProviderCost && available < requiredCredits) {
    return {
      allowed: false,
      requiredCredits,
      confirmationRequired: false,
      reason: "free_account_provider_action",
      balanceAfter: available,
      upgradeSuggestion: "creator",
      reservedCostUsd: action.reservedCostUsd,
      marginEstimateUsd: estimateMarginUsd(action.reservedCostUsd, requiredCredits),
      actionType: action.actionType,
      service: action.service,
      provider: action.provider,
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
      reservedCostUsd: action.reservedCostUsd,
      marginEstimateUsd: estimateMarginUsd(action.reservedCostUsd, requiredCredits),
      actionType: action.actionType,
      service: action.service,
      provider: action.provider,
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
    reservedCostUsd: action.reservedCostUsd,
    marginEstimateUsd: estimateMarginUsd(action.reservedCostUsd, requiredCredits),
    actionType: action.actionType,
    service: action.service,
    provider: action.provider,
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
  action: NonNullable<ReturnType<typeof getActionCost>>,
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

/** V1 policy: credits never expire on cancellation — account moves to prepaid. */
export function applySubscriptionCancellationPolicy(input: {
  creditPolicyVersion: string;
}): { billingStatus: "prepaid"; retainCredits: true } {
  if (input.creditPolicyVersion === "v1") {
    return { billingStatus: "prepaid", retainCredits: true };
  }
  return { billingStatus: "prepaid", retainCredits: true };
}
