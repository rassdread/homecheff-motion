/** Admin profitability & unit economics — built on ProviderCostEvent + CustomerBillingEvent. */

export type ProfitabilityPeriodKey = "last7Days" | "last30Days" | "last90Days" | "last365Days" | "allTime";

export type ProviderCostBreakdown = {
  openaiUsd: number;
  elevenlabsUsd: number;
  viduUsd: number;
  storageUsd: number;
  otherUsd: number;
  totalUsd: number;
};

export type PeriodProfitabilityTotals = {
  revenueEur: number;
  costUsd: number;
  costEur: number;
  profitEur: number;
  marginPercent: number;
  projectCount: number;
  userCount: number;
  costEventCount: number;
  billingEventCount: number;
};

export type ProjectProfitabilityRow = {
  projectId: string;
  projectTitle: string | null;
  revenueEur: number;
  costs: ProviderCostBreakdown;
  totalCostUsd: number;
  profitEur: number;
  marginPercent: number;
  warning: ProfitabilityWarning | null;
};

export type UserPeriodProfitability = {
  revenueEur: number;
  costUsd: number;
  profitEur: number;
  marginPercent: number;
};

export type UserProfitabilityRow = {
  userId: string;
  email: string;
  revenueEur: number;
  costs: ProviderCostBreakdown;
  totalCostUsd: number;
  profitEur: number;
  marginPercent: number;
  projectCount: number;
  last30Days: UserPeriodProfitability;
  last90Days: UserPeriodProfitability;
  last365Days: UserPeriodProfitability;
  warning: ProfitabilityWarning | null;
  isPowerUser: boolean;
};

export type FeatureProfitabilityRow = {
  featureKey: string;
  label: string;
  calls: number;
  revenueEur: number;
  costUsd: number;
  profitEur: number;
  marginPercent: number;
  avgCostUsd: number;
  avgRevenueEur: number;
  warning: ProfitabilityWarning | null;
};

export type ProviderTrendRow = {
  provider: keyof ProviderCostBreakdown;
  label: string;
  last7DaysUsd: number;
  last30DaysUsd: number;
  last90DaysUsd: number;
  last365DaysUsd: number;
  sharePercent30d: number;
};

export type ProfitabilityWarning = "low_margin" | "negative_margin" | "cost_spike";

export type NegativeMarginAlert = {
  kind: "project" | "user" | "feature";
  id: string;
  label: string;
  revenueEur: number;
  costEur: number;
  profitEur: number;
  marginPercent: number;
  warning: ProfitabilityWarning;
};

export type SubscriptionPlanSimulation = {
  planId: string;
  planLabel: string;
  monthlyPriceEur: number;
  profitableUserCount: number;
  lossMakingUserCount: number;
  totalUsers: number;
  avgMarginEur: number;
  avgMarginPercent: number;
  breakEvenUserPercent: number;
};

export type UnitEconomicsRow = {
  actionKey: string;
  label: string;
  totalCalls: number;
  totalCostUsd: number;
  avgCostUsd: number;
  totalRevenueEur: number;
  avgRevenueEur: number;
};

export type UnitEconomicsSummary = {
  costPerProjectUsd: number;
  costPerActiveUserUsd: number;
  revenuePerProjectEur: number;
  revenuePerActiveUserEur: number;
  projectCount: number;
  activeUserCount: number;
  byAction: UnitEconomicsRow[];
};

export type StudioProfitabilityReport = {
  generatedAt: string;
  executiveSummary: Record<ProfitabilityPeriodKey, PeriodProfitabilityTotals>;
  providerBreakdown: ProviderTrendRow[];
  projectProfitability: ProjectProfitabilityRow[];
  userProfitability: UserProfitabilityRow[];
  featureProfitability: FeatureProfitabilityRow[];
  negativeMarginAlerts: NegativeMarginAlert[];
  subscriptionSimulation: SubscriptionPlanSimulation[];
  unitEconomics: UnitEconomicsSummary;
  topProfitableUsers: UserProfitabilityRow[];
  topCostUsers: UserProfitabilityRow[];
  topProfitableProjects: ProjectProfitabilityRow[];
  topLossProjects: ProjectProfitabilityRow[];
  topProfitableFeatures: FeatureProfitabilityRow[];
  topLossFeatures: FeatureProfitabilityRow[];
};

/** User-facing studio usage — no internal margins. */
export type UserStudioInsightsReport = {
  generatedAt: string;
  periodLabel: string;
  projectsCreated: number;
  sceneImagesGenerated: number;
  assetReferencesGenerated: number;
  voicePreviews: number;
  voiceClones: number;
  motionRenders: number;
  languageExports: number;
  textRerenders: number;
  translations: number;
  assetsDerived: number;
  estimatedTimeSavedMinutes: number;
  estimatedProviderActions: number;
  withinLimits: boolean;
  limitHintKey: string | null;
};

export type UserStudioAssetCounts = {
  projects: number;
  storyboards: number;
  characters: number;
  props: number;
  locations: number;
  worlds: number;
};

import type { StudioAssetLibraryCounts } from "@/types/studio-asset-library-counts";

export type { StudioAssetLibraryCounts };

export type UserStudioActivityKind =
  | "project_created"
  | "storyboard_created"
  | "character_created"
  | "prop_created"
  | "location_created"
  | "world_created"
  | "voice_clone_created"
  | "motion_render"
  | "asset_derived"
  | "scene_image";

export type UserStudioActivityItem = {
  id: string;
  at: string;
  kind: UserStudioActivityKind;
  title: string;
  href: string | null;
};

export type StudioHomeRecentItem = {
  id: string;
  kind: "storyboard" | "character" | "prop" | "location" | "world";
  title: string;
  href: string;
  at: string;
};

export type StudioContinueWorkingItem = {
  id: string;
  kind: "storyboard" | "character" | "prop" | "location" | "world" | "project" | "motion";
  title: string;
  href: string;
  updatedAt: string;
  /** S2H human status when from project library. */
  status?: string;
};

export type UserStudioDashboardReport = UserStudioInsightsReport & {
  assetCounts: UserStudioAssetCounts;
  libraryCounts: StudioAssetLibraryCounts;
  librarySummary: {
    favoritesCount: number;
    voiceFavoritesCount: number;
  };
  recentActivity: UserStudioActivityItem[];
  recentStoryboards: StudioHomeRecentItem[];
  continueWorking: StudioContinueWorkingItem[];
};
