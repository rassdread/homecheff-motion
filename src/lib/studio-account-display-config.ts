/** Client-safe display config for account billing UI. */

export type StudioPlanDisplay = {
  id: string;
  labelKey: string;
  monthlyPriceEur: number;
  monthlyCredits: number;
};

export type StudioCreditPackDisplay = {
  id: string;
  credits: number;
  priceEur: number;
};

export const STUDIO_PLAN_DISPLAY: StudioPlanDisplay[] = [
  { id: "creator", labelKey: "account.plan.creator", monthlyPriceEur: 19, monthlyCredits: 3000 },
  { id: "pro", labelKey: "account.plan.pro", monthlyPriceEur: 49, monthlyCredits: 8000 },
  { id: "studio", labelKey: "account.plan.studio", monthlyPriceEur: 99, monthlyCredits: 12000 },
];

export const STUDIO_CREDIT_PACK_DISPLAY: StudioCreditPackDisplay[] = [
  { id: "pack_500", credits: 500, priceEur: 4.99 },
  { id: "pack_1250", credits: 1250, priceEur: 9.99 },
  { id: "pack_3000", credits: 3000, priceEur: 19.99 },
  { id: "pack_8000", credits: 8000, priceEur: 49.99 },
];
