export const STUDIO_ACCOUNT_TYPES = [
  "free",
  "creator",
  "pro",
  "studio",
  "enterprise",
] as const;

export type StudioAccountType = (typeof STUDIO_ACCOUNT_TYPES)[number];

export const STUDIO_ACCOUNT_STATUSES = ["active", "suspended", "closed"] as const;
export type StudioAccountStatus = (typeof STUDIO_ACCOUNT_STATUSES)[number];

export const STUDIO_BILLING_STATUSES = [
  "none",
  "active",
  "past_due",
  "canceled",
  "prepaid",
] as const;

export type StudioBillingStatus = (typeof STUDIO_BILLING_STATUSES)[number];

export const STUDIO_LEDGER_ACTION_TYPES = [
  "credit_purchase",
  "subscription_grant",
  "subscription_payment",
  "admin_grant",
  "promotional_grant",
  "usage_charge",
  "usage_reservation",
  "usage_capture",
  "usage_refund",
  "failed_generation_refund",
  "bonus_grant",
  "expiration_adjustment",
  "manual_adjustment",
] as const;

export type StudioLedgerActionType = (typeof STUDIO_LEDGER_ACTION_TYPES)[number];

export type StudioAccountSnapshot = {
  userId: string;
  email: string;
  accountType: StudioAccountType;
  studioPlan: string;
  planVersion: string;
  creditPolicyVersion: string;
  accountStatus: StudioAccountStatus;
  billingStatus: StudioBillingStatus;
  activatedAt: string | null;
  autoChargeSmallActions: boolean;
  confirmAboveCredits: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
};

export type StudioWalletSnapshot = {
  balance: number;
  purchasedBalance: number;
  promotionalBalance: number;
  reservedBalance: number;
  availableBalance: number;
  lifetimePurchased: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
  lifetimeRefunded: number;
  lastTransactionAt: string | null;
};

/**
 * Central HC wallet is ecosystem-wide and keyed by `centralUserId`.
 * When identity + wallet are resolved, Studio UX must treat availableHc as the
 * primary customer-facing spendable balance (see `canonicalBalance`).
 * Legacy StudioWallet remains for intentional product-local actions / ledger.
 */
export type CentralHcWalletSnapshot = {
  /** Studio account is linked to central identity. */
  identityResolved: boolean;
  /** Central HC wallet row exists (ACTIVE/SUSPENDED/etc). */
  walletResolved: boolean;
  /** Spendable central HC. */
  availableHc: number;
  /** Reserved central HC (in-flight provider jobs). */
  reservedHc: number;
  /** HcWallet status string from the DB, if present. */
  walletStatus: string | null;
};

/**
 * Single Studio display/gate contract — derived from central HC when linked,
 * otherwise legacy StudioWallet. Never invent a second wallet.
 */
export type StudioCanonicalBalance = {
  spendable: number | null;
  reserved: number;
  unit: "HC" | "credits";
  source: "central_hc" | "legacy_studio_wallet" | "unavailable";
  legacyStudioAvailable: number;
  identityResolved: boolean;
  walletResolved: boolean;
};

export type StudioLedgerRow = {
  id: string;
  projectId: string | null;
  service: string;
  actionType: StudioLedgerActionType;
  creditsDelta: number;
  balanceAfter: number;
  creditOrigin: string | null;
  provider: string | null;
  providerCostUsd: number | null;
  reservedCostUsd: number | null;
  marginEstimate: number | null;
  metadataJson: Record<string, unknown>;
  createdAt: string;
};

export type StudioAccountOverview = {
  account: StudioAccountSnapshot;
  wallet: StudioWalletSnapshot;
  recentLedger: StudioLedgerRow[];
  centralHc?: CentralHcWalletSnapshot | null;
  /** Primary customer-facing spendable — use this on all Studio balance surfaces. */
  canonicalBalance?: StudioCanonicalBalance | null;
};

export type StudioCreditSettingsPatch = {
  autoChargeSmallActions?: boolean;
  confirmAboveCredits?: number;
};
