export const CREDIT_ORIGIN_TYPES = [
  "PURCHASED",
  "PROMOTIONAL",
  "BETA",
  "COMPENSATION",
  "REFERRAL",
  "MANUAL_GRANT",
] as const;

export type CreditOriginType = (typeof CREDIT_ORIGIN_TYPES)[number];

export const CARRY_MODES = [
  "UNLIMITED",
  "TWELVE_MONTHS",
  "SIX_MONTHS",
  "THREE_MONTHS",
  "NONE",
] as const;

export type CarryMode = (typeof CARRY_MODES)[number];

export const PROMOTION_GRANT_TYPES = [
  "PROMOTIONAL",
  "BETA",
  "COMPENSATION",
  "REFERRAL",
] as const;

export type PromotionGrantType = (typeof PROMOTION_GRANT_TYPES)[number];

export const PROMOTION_BENEFIT_TYPES = [
  "bonus_credits",
  "percentage_discount",
  "fixed_discount",
  "subscription_discount",
  "credit_pack_bonus",
  "free_trial_credits",
] as const;

export type PromotionBenefitType = (typeof PROMOTION_BENEFIT_TYPES)[number];

export type StudioPlanBenefits = {
  creditDiscountPercent: number;
  autoTopUpAvailable: boolean;
  storageLimitGb: number | null;
  featureFlags: string[];
};

export type StudioSubscriptionPlanSnapshot = {
  id: string;
  slug: string;
  name: string;
  description: string;
  monthlyPriceEur: number | null;
  yearlyPriceEur: number | null;
  discountPercent: number;
  storageLimitGb: number | null;
  featureFlags: string[];
  autoTopUpAvailable: boolean;
  isVisible: boolean;
  isActive: boolean;
  displayOrder: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  source: "database" | "fallback";
};

export type StudioCreditPackSnapshot = {
  id: string;
  slug: string;
  name: string;
  credits: number;
  priceEur: number;
  bonusCredits: number;
  active: boolean;
  displayOrder: number;
  stripePriceId: string | null;
  source: "database" | "fallback";
};

export type StudioBillingPolicySnapshot = {
  carryMode: CarryMode;
  newUserGrantCredits: number;
  newUserPromotionCredits: number;
  betaLaunchCredits: number;
  newUserCampaignMaxUsers: number;
  newUserCampaignRedeemed: number;
  defaultConfirmAboveCredits: number;
  plans: Record<string, StudioPlanBenefits>;
  updatedAt: string;
};

export type StudioPromotionSnapshot = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  descriptionInternal: string;
  benefitType: PromotionBenefitType;
  creditAmount: number;
  maximumUsers: number;
  maxRedemptions: number | null;
  maxRedemptionsPerUser: number;
  percentageDiscount: number | null;
  fixedDiscountEur: number | null;
  subscriptionDiscountPercent: number | null;
  creditPackBonusPercent: number | null;
  freeTrialCredits: number | null;
  discountDuration: string;
  discountDurationMonths: number | null;
  allowedPlanSlugs: string[];
  appliesToMonthly: boolean;
  appliesToYearly: boolean;
  bonusCreditsApplyWhen: string;
  bonusCreditsExpireDays: number | null;
  newUserOnly: boolean;
  specificPlanSlug: string | null;
  grantType: PromotionGrantType;
  startDate: string | null;
  endDate: string | null;
  stripeCouponId: string | null;
  redemptionCount: number;
  remainingSlots: number;
  estimatedCostUsd: number;
  promoCodeCount: number;
  primaryCode: string | null;
  primaryCodeUsedCount: number;
  primaryCodeMaxUses: number | null;
  stripeLinked: boolean;
};

export type StudioPromoCodeSnapshot = {
  id: string;
  code: string;
  promotionId: string;
  promotionName: string;
  active: boolean;
  maxUses: number | null;
  usedCount: number;
  remainingUses: number | null;
  startDate: string | null;
  endDate: string | null;
  notes: string;
  stripePromotionCodeId: string | null;
  stripeCouponId: string | null;
  benefitType: PromotionBenefitType;
  overviewLine: string;
};

export type PromoValidationResult = {
  valid: boolean;
  code: string;
  promotionId?: string;
  promotionName?: string;
  benefitType?: PromotionBenefitType;
  reason?: string;
  summaryNl?: string;
  summaryEn?: string;
  bonusCredits?: number;
  discountPercent?: number;
  discountEur?: number;
  subscriptionDiscountPercent?: number;
  creditPackBonusPercent?: number;
  freeTrialCredits?: number;
  adjustedPriceEur?: number;
  durationLabelNl?: string;
  durationLabelEn?: string;
  stripePromotionCodeId?: string;
  stripeApplied?: boolean;
};

export type StudioPricingRuleSnapshot = {
  id: string;
  actionType: string;
  creditCost: number;
  providerCostUsd: number;
  active: boolean;
  notes: string;
  source: "database" | "registry";
};

export type ExtendedStudioWalletSnapshot = {
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

export type AssistantBillingContext = {
  walletAvailableCredits?: number;
  studioPlan?: string;
};

export type AssistantBillingPreview = {
  estimatedCredits: number;
  availableCredits: number;
  balanceAfter: number;
  savingsFromReuse: Array<{ label: string; creditsSaved: number }>;
  summaryNl: string;
  summaryEn: string;
};

export type BillingAnalyticsSnapshot = {
  mrrEur: number;
  arrEur: number;
  creditsSold: number;
  creditsConsumed: number;
  creditsGranted: number;
  providerCostUsd: number;
  grossRevenueEur: number;
  netRevenueEur: number;
  grossMarginPercent: number;
  activeSubscriptions: number;
  churnedSubscriptions: number;
  topPromotions: Array<{ name: string; redemptions: number; creditsGranted: number }>;
  topPlans: Array<{ slug: string; name: string; subscribers: number }>;
  topCreditPacks: Array<{ slug: string; name: string; creditsSold: number }>;
};

export type StripeReadinessSnapshot = {
  connected: boolean;
  environment: "live" | "test" | "missing";
  webhookConfigured: boolean;
  plans: Array<{
    slug: string;
    name: string;
    monthlyPriceId: string | null;
    yearlyPriceId: string | null;
    warnings: string[];
  }>;
  creditPacks: Array<{ slug: string; name: string; priceId: string | null; warnings: string[] }>;
  missingConfiguration: string[];
  recentBillingFailures: number;
};

export type AdminUserBillingSnapshot = {
  userId: string;
  email: string;
  plan: string;
  billingStatus: string;
  wallet: ExtendedStudioWalletSnapshot | null;
  ledger: Array<{
    id: string;
    actionType: string;
    creditsDelta: number;
    balanceAfter: number;
    creditOrigin: string | null;
    provider: string | null;
    providerCostUsd: number | null;
    marginEstimate: number | null;
    providerCostEventId: string | null;
    studioActionType: string | null;
    negativeMargin: boolean;
    createdAt: string;
  }>;
  promotionsRedeemed: Array<{ name: string; creditsGranted: number; createdAt: string }>;
  promoCodesUsed: Array<{ code: string; appliedAt: string }>;
  totalSpentCredits: number;
  providerCostUsd: number;
  marginEstimateUsd: number;
};
