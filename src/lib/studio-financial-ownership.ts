/**
 * S.8B — Canonical financial ownership boundaries (no second wallet mutator).
 */

export const STUDIO_FINANCIAL_OWNERS = {
  billing: [
    "stripe_customer",
    "checkout",
    "subscriptions",
    "packs",
    "promo_money_in",
    "auto_topup_payment_execution",
    "portal",
    "money_in_events",
  ],
  credits: [
    "wallet",
    "reserve",
    "capture",
    "refund",
    "available_balance",
    "spend_order",
    "ledger_mutations",
  ],
  generationJobs: [
    "execution_lifecycle",
    "idempotency_identity",
    "replay",
    "recover",
    "charge_finalized",
  ],
  providers: ["sdk_calls", "provider_request_ids", "provider_job_ids"],
  telemetry: ["provider_cost_event", "provider_usage_log", "provider_cogs_metadata"],
} as const;

export type StudioFinancialOwner = keyof typeof STUDIO_FINANCIAL_OWNERS;

/** Privacy-safe correlation id for S.8C (no email/PII). */
export function buildFinancialCorrelationId(parts: {
  ownerId: string;
  actionType: string;
  jobId?: string | null;
  reservationId?: string | null;
  stripeObjectId?: string | null;
}): string {
  const raw = [
    parts.ownerId,
    parts.actionType,
    parts.jobId ?? "",
    parts.reservationId ?? "",
    parts.stripeObjectId ?? "",
  ].join(":");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `fc_${parts.actionType}_${hash.toString(16)}`;
}

export function assertOwnerDoesNotMutateWallet(owner: StudioFinancialOwner): boolean {
  return owner === "credits" || owner === "billing";
}
