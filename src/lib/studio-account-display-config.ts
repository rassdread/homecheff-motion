/** Client-safe display config for account billing UI. */

import type { TranslationKey } from "@/i18n";
import {
  customerFacingMonthlyHcGrant,
  customerFacingMonthlyPriceEur,
} from "@/lib/studio-customer-facing-pricing";
import { PAID_STUDIO_PLAN_IDS, type PaidStudioPlanId } from "@/lib/studio-subscription-prices";
import { OFFICIAL_PLAN_STORAGE_GB } from "@/lib/studio-subscription-storage";

export type StudioPlanDisplay = {
  id: string;
  labelKey: TranslationKey;
  monthlyPriceEur: number;
  storageLimitGb: number;
  monthlyCredits: number;
  creditDiscountPercent: number;
};

export type StudioCreditPackDisplay = {
  id: string;
  credits: number;
  priceEur: number;
};

const PAID_PLAN_IDS: PaidStudioPlanId[] = PAID_STUDIO_PLAN_IDS;

const PLAN_LABEL_KEYS: Record<PaidStudioPlanId, TranslationKey> = {
  creator: "account.plan.creator",
  pro: "account.plan.pro",
  studio: "account.plan.studio",
};

const PLAN_DISCOUNTS: Record<PaidStudioPlanId, number> = {
  creator: 10,
  pro: 15,
  studio: 20,
};

export const STUDIO_PLAN_DISPLAY: StudioPlanDisplay[] = PAID_PLAN_IDS.map((id) => ({
  id,
  labelKey: PLAN_LABEL_KEYS[id],
  monthlyPriceEur: customerFacingMonthlyPriceEur(id),
  storageLimitGb: OFFICIAL_PLAN_STORAGE_GB[id],
  monthlyCredits: customerFacingMonthlyHcGrant(id),
  creditDiscountPercent: PLAN_DISCOUNTS[id],
}));

export const STUDIO_CREDIT_PACK_DISPLAY: StudioCreditPackDisplay[] = [
  { id: "pack_500", credits: 500, priceEur: 4.99 },
  { id: "pack_1250", credits: 1250, priceEur: 9.99 },
  { id: "pack_3000", credits: 3000, priceEur: 19.99 },
  { id: "pack_8000", credits: 8000, priceEur: 49.99 },
];
