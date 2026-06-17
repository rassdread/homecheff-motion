export const CONVERSION_PAGE_TYPES = [
  "homepage",
  "studio_dashboard",
  "motion",
  "library",
  "projects",
  "usage",
  "knowledge",
  "pricing",
  "billing",
  "empty_state",
  "generic",
] as const;

export type ConversionPageType = (typeof CONVERSION_PAGE_TYPES)[number];

export type ConversionUsageLevel = "high" | "medium" | "low" | "zero";

export type ConversionSurfaceInput = {
  currentPlan: string;
  availableCredits: number;
  pageType: ConversionPageType;
  loggedIn: boolean;
  usageLevel: ConversionUsageLevel;
  estimatedCredits?: number;
  creditsUsedThisMonth?: number;
};

export type ConversionSurfaceOutput = {
  showBuyCredits: boolean;
  showUpgradePlan: boolean;
  showViewPricing: boolean;
  showPromoCampaign: boolean;
  showInsufficientBlock: boolean;
  headlineKey?: string;
  bodyKey?: string;
  promoPlanId?: "creator" | "pro" | "studio";
};

export type ConversionSurfaceVariant =
  | "banner"
  | "inline"
  | "compact"
  | "sidebar"
  | "hero"
  | "article-footer"
  | "sticky";
