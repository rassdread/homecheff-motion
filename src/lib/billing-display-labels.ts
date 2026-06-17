import type { TranslationKey } from "@/i18n";

type Translator = (key: TranslationKey, params?: Record<string, string | number>) => string;

const LEDGER_ACTION_KEYS: Record<string, TranslationKey> = {
  credit_purchase: "account.ledger.action.creditPurchase",
  subscription_grant: "account.ledger.action.subscriptionGrant",
  admin_grant: "account.ledger.action.adminGrant",
  promotional_grant: "account.ledger.action.promotionalGrant",
  bonus_grant: "account.ledger.action.bonusGrant",
  usage_charge: "account.ledger.action.usageCharge",
  usage_reservation: "account.ledger.action.usageReservation",
  usage_capture: "account.ledger.action.usageCapture",
  usage_refund: "account.ledger.action.usageRefund",
  failed_generation_refund: "account.ledger.action.failedGenerationRefund",
  expiration_adjustment: "account.ledger.action.expirationAdjustment",
  manual_adjustment: "account.ledger.action.manualAdjustment",
};

const CREDIT_SOURCE_KEYS: Record<string, TranslationKey> = {
  PURCHASED: "account.ledger.source.purchased",
  PROMOTIONAL: "account.ledger.source.bonus",
  MANUAL_GRANT: "account.ledger.source.manualGrant",
  BETA: "account.ledger.source.beta",
  COMPENSATION: "account.ledger.source.compensation",
  REFERRAL: "account.ledger.source.referral",
};

const PROMO_REASON_KEYS: Record<string, TranslationKey> = {
  empty_code: "account.billing.campaignReason.emptyCode",
  invalid_code: "account.billing.campaignReason.invalidCode",
  promotion_inactive: "account.billing.campaignReason.inactive",
  code_expired: "account.billing.campaignReason.codeExpired",
  promotion_expired: "account.billing.campaignReason.campaignExpired",
  code_max_uses: "account.billing.campaignReason.codeMaxUses",
  promotion_full: "account.billing.campaignReason.campaignFull",
  new_users_only: "account.billing.campaignReason.newUsersOnly",
  wrong_plan: "account.billing.campaignReason.wrongPlan",
  wrong_checkout_type: "account.billing.campaignReason.wrongCheckoutType",
  already_used: "account.billing.campaignReason.alreadyUsed",
  invalid: "account.billing.campaignReason.invalidCode",
  not_found: "account.billing.campaignReason.invalidCode",
};

export function formatLedgerActionLabel(actionType: string, t: Translator): string {
  const key = LEDGER_ACTION_KEYS[actionType];
  return key ? t(key) : actionType.replace(/_/g, " ");
}

export function formatCreditSourceLabel(origin: string | null | undefined, t: Translator): string | null {
  if (!origin) return null;
  const key = CREDIT_SOURCE_KEYS[origin];
  return key ? t(key) : origin;
}

export function formatCampaignCodeReason(reason: string | undefined, t: Translator): string {
  if (!reason) return t("account.billing.campaignReason.invalidCode");
  const key = PROMO_REASON_KEYS[reason];
  return key ? t(key) : reason.replace(/_/g, " ");
}

export function pickCampaignSummary(
  preview: { summaryNl?: string; summaryEn?: string },
  locale: string | undefined
): string | undefined {
  const nl = !locale || locale.startsWith("nl");
  return nl ? preview.summaryNl ?? preview.summaryEn : preview.summaryEn ?? preview.summaryNl;
}

export function buildAssistantBillingSummary(input: {
  estimatedCredits: number;
  availableCredits: number;
  balanceAfter: number;
  savingsText?: string;
  locale?: string;
}): { summaryNl: string; summaryEn: string; lowBalanceWarning?: boolean } {
  const savings = input.savingsText ?? "";
  const nl = !input.locale || input.locale.startsWith("nl");
  const lowBalanceWarning = input.availableCredits <= 100 || input.balanceAfter <= 50;

  const lowNl =
    lowBalanceWarning
      ? " Je credits raken op — overweeg credits bij te kopen voordat je meerdere renders start."
      : "";
  const lowEn =
    lowBalanceWarning
      ? " You may want to top up credits before running multiple renders."
      : "";

  return {
    summaryNl: `Dit kost naar schatting ${input.estimatedCredits} credits. Je hebt ${input.availableCredits} credits beschikbaar. Na deze actie houd je ${input.balanceAfter} credits over.${savings}${lowNl}`,
    summaryEn: `This will use about ${input.estimatedCredits} credits. You currently have ${input.availableCredits} available. After this action you'll have ${input.balanceAfter} credits left.${savings}${lowEn}`,
    lowBalanceWarning,
  };
}
