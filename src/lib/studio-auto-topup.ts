/**
 * S.8B — Auto Top-Up canonical contract (minimum runtime over CONFIG_ONLY).
 *
 * Commercial model unchanged: prepaid packs fund usage; plan autoTopUpAvailable = eligibility.
 * Discount on pack EUR is NOT applied via creditDiscountPercent today (that discounts action costs).
 * Manual pack and Auto Top-Up must share the same pack checkout/grant path for parity.
 */

import { getStudioPlan, type StudioPlanId } from "@/server/studio-account/studio-plan-config";
import { getCreditPack, type StudioCreditPackId } from "@/server/studio-account/studio-credit-packs";

export const STUDIO_AUTO_TOPUP_RUNTIME_BEFORE = "CONFIG_ONLY" as const;

export type StudioAutoTopUpStatus =
  | "disabled"
  | "enabled"
  | "pending_payment"
  | "failed"
  | "payment_method_required"
  | "payment_auth_required";

export type StudioAutoTopUpSettings = {
  enabled: boolean;
  thresholdCredits: number;
  topUpPackId: StudioCreditPackId;
  consentAt: string | null;
  status: StudioAutoTopUpStatus;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  failureCount: number;
  /** Technical duplicate protection — not a business spend cap invention */
  maxAttemptsPerHour: number;
};

export const STUDIO_AUTO_TOPUP_DEFAULTS: Omit<
  StudioAutoTopUpSettings,
  "consentAt" | "lastAttemptAt" | "lastSuccessAt" | "failureCount" | "status"
> = {
  enabled: false,
  thresholdCredits: 50,
  topUpPackId: "pack_500",
  maxAttemptsPerHour: 3,
};

export function isPlanAutoTopUpEligible(planId: string): boolean {
  const plan = getStudioPlan(planId);
  return Boolean(plan.autoTopUpAvailable);
}

export function evaluateAutoTopUpTrigger(input: {
  settings: StudioAutoTopUpSettings;
  planId: string;
  availableCredits: number;
  requiredCredits: number;
  hasPaymentMethod: boolean;
}): {
  shouldTrigger: boolean;
  reason:
    | "ok"
    | "disabled"
    | "plan_ineligible"
    | "consent_missing"
    | "balance_sufficient"
    | "payment_method_required"
    | "pack_invalid";
} {
  if (!input.settings.enabled) {
    return { shouldTrigger: false, reason: "disabled" };
  }
  if (!input.settings.consentAt) {
    return { shouldTrigger: false, reason: "consent_missing" };
  }
  if (!isPlanAutoTopUpEligible(input.planId)) {
    return { shouldTrigger: false, reason: "plan_ineligible" };
  }
  if (!getCreditPack(input.settings.topUpPackId)) {
    return { shouldTrigger: false, reason: "pack_invalid" };
  }
  // Canonical: only when an action needs more credits than available (not idle low-balance).
  if (input.availableCredits >= input.requiredCredits) {
    return { shouldTrigger: false, reason: "balance_sufficient" };
  }
  if (!input.hasPaymentMethod) {
    return { shouldTrigger: false, reason: "payment_method_required" };
  }
  return { shouldTrigger: true, reason: "ok" };
}

export function buildAutoTopUpIdempotencyKey(input: {
  userId: string;
  packId: string;
  /** UTC hour bucket — prevents parallel duplicate packs in the same trigger window */
  windowHourIso: string;
}): string {
  return `auto_topup:${input.userId}:${input.packId}:${input.windowHourIso}`;
}

export function utcHourBucket(now = new Date()): string {
  return now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
}

export function resolvePackCatalogSourceOfTruth(): {
  canonical: "db_with_ts_fallback";
  note: string;
} {
  return {
    canonical: "db_with_ts_fallback",
    note: "StudioCreditPack DB rows override; STUDIO_CREDIT_PACKS is fallback display/seed.",
  };
}

export function resolvePlanCatalogSourceOfTruth(): {
  canonical: "db_with_ts_fallback";
  note: string;
} {
  return {
    canonical: "db_with_ts_fallback",
    note: "StudioSubscriptionPlan DB rows override; STUDIO_PLANS is fallback.",
  };
}

export function carryPolicyProductionSupport(carryMode: string): {
  supported: boolean;
  mode: string;
  honesty: string;
} {
  if (carryMode === "UNLIMITED") {
    return {
      supported: true,
      mode: "UNLIMITED",
      honesty: "Production supports UNLIMITED only until expiry scheduler is proven.",
    };
  }
  return {
    supported: false,
    mode: carryMode,
    honesty:
      "Time-boxed carry modes exist in policy storage but expiry enforcement is NOT proven — do not claim expiry works.",
  };
}

export type SuggestionActionClass = "LIVE_BILLABLE" | "FREE" | "UNWIRED" | "LEGACY";

export function classifySuggestionAction(
  actionType: "voice_suggestion" | "music_suggestion"
): SuggestionActionClass {
  void actionType;
  // Registry priced; no GenerationJob / billed route wiring proven in S.8A — remains UNWIRED.
  return "UNWIRED";
}

export function listStudioPlanIds(): StudioPlanId[] {
  return ["free", "creator", "pro", "studio", "enterprise"];
}
