/**
 * Central V1 pricing rules — config-only (future: load from database).
 * Credit unit cost: $0.005 USD.
 */

export const PRICING_PLAN_V1 = "v1" as const;

export type VideoPricingActionType =
  | "vidu_render"
  | "text_rerender"
  | "language_export"
  | "full_export";

export type VideoRenderType =
  | "transition_mode"
  | "story_mode"
  | "text_rerender"
  | "language_export"
  | "full_export"
  | "concept_render"
  | "classic";

export type VideoPricingRule = {
  actionType: VideoPricingActionType;
  renderType: VideoRenderType;
  minCredits: number;
  /** null = open-ended top tier */
  maxCredits: number | null;
  basePriceEur: number;
  /** For open-ended tiers: add this per overflowStepCredits above maxCredits of prior tier */
  overflowPriceEur?: number;
  overflowStepCredits?: number;
  minimumMarginPercent: number;
  isActive: boolean;
  labelNl: string;
  labelEn: string;
};

/** Standalone flat-price actions (not credit-tiered). */
export type FlatPricingRule = {
  actionType: VideoPricingActionType;
  renderType: VideoRenderType;
  basePriceEur: number;
  minimumMarginPercent: number;
  isActive: boolean;
  labelNl: string;
  labelEn: string;
};

export const TRANSITION_MODE_PRICING_RULES: VideoPricingRule[] = [
  {
    actionType: "vidu_render",
    renderType: "transition_mode",
    minCredits: 0,
    maxCredits: 100,
    basePriceEur: 0.99,
    minimumMarginPercent: 30,
    isActive: true,
    labelNl: "Transition Mode — 0–100 credits",
    labelEn: "Transition Mode — 0–100 credits",
  },
  {
    actionType: "vidu_render",
    renderType: "transition_mode",
    minCredits: 101,
    maxCredits: 200,
    basePriceEur: 1.99,
    minimumMarginPercent: 30,
    isActive: true,
    labelNl: "Transition Mode — 101–200 credits",
    labelEn: "Transition Mode — 101–200 credits",
  },
  {
    actionType: "vidu_render",
    renderType: "transition_mode",
    minCredits: 201,
    maxCredits: 350,
    basePriceEur: 2.99,
    minimumMarginPercent: 30,
    isActive: true,
    labelNl: "Transition Mode — 201–350 credits",
    labelEn: "Transition Mode — 201–350 credits",
  },
  {
    actionType: "vidu_render",
    renderType: "transition_mode",
    minCredits: 351,
    maxCredits: null,
    basePriceEur: 3.99,
    overflowPriceEur: 0.5,
    overflowStepCredits: 100,
    minimumMarginPercent: 25,
    isActive: true,
    labelNl: "Transition Mode — 351+ credits",
    labelEn: "Transition Mode — 351+ credits",
  },
];

export const STORY_MODE_PRICING_RULES: VideoPricingRule[] = [
  {
    actionType: "vidu_render",
    renderType: "story_mode",
    minCredits: 0,
    maxCredits: 300,
    basePriceEur: 2.99,
    minimumMarginPercent: 30,
    isActive: true,
    labelNl: "Story Mode — 0–300 credits",
    labelEn: "Story Mode — 0–300 credits",
  },
  {
    actionType: "vidu_render",
    renderType: "story_mode",
    minCredits: 301,
    maxCredits: 600,
    basePriceEur: 4.99,
    minimumMarginPercent: 30,
    isActive: true,
    labelNl: "Story Mode — 301–600 credits",
    labelEn: "Story Mode — 301–600 credits",
  },
  {
    actionType: "vidu_render",
    renderType: "story_mode",
    minCredits: 601,
    maxCredits: 900,
    basePriceEur: 6.99,
    minimumMarginPercent: 30,
    isActive: true,
    labelNl: "Story Mode — 601–900 credits",
    labelEn: "Story Mode — 601–900 credits",
  },
  {
    actionType: "vidu_render",
    renderType: "story_mode",
    minCredits: 901,
    maxCredits: null,
    basePriceEur: 9.99,
    overflowPriceEur: 1.0,
    overflowStepCredits: 200,
    minimumMarginPercent: 25,
    isActive: true,
    labelNl: "Story Mode — 901+ credits",
    labelEn: "Story Mode — 901+ credits",
  },
];

export const FLAT_PRICING_RULES: FlatPricingRule[] = [
  {
    actionType: "text_rerender",
    renderType: "text_rerender",
    basePriceEur: 0.49,
    minimumMarginPercent: 0,
    isActive: true,
    labelNl: "Text rerender — per versie",
    labelEn: "Text rerender — per version",
  },
  {
    actionType: "language_export",
    renderType: "language_export",
    basePriceEur: 0.99,
    minimumMarginPercent: 0,
    isActive: true,
    labelNl: "Taalversie — per export",
    labelEn: "Language export — per version",
  },
  {
    actionType: "full_export",
    renderType: "full_export",
    basePriceEur: 0.49,
    minimumMarginPercent: 0,
    isActive: true,
    labelNl: "Losse export / download",
    labelEn: "Standalone export / download",
  },
];

export const ALL_CREDIT_TIER_RULES: VideoPricingRule[] = [
  ...TRANSITION_MODE_PRICING_RULES,
  ...STORY_MODE_PRICING_RULES,
];

export function resolveFullExportPriceEur(): number {
  const raw = process.env.STANDALONE_EXPORT_PRICE_EUR?.trim();
  if (!raw) {
    return FLAT_PRICING_RULES.find((r) => r.actionType === "full_export")?.basePriceEur ?? 0.49;
  }
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0.49;
}
