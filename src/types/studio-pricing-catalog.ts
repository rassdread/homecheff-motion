import type { PricingCatalogCategory } from "@/lib/studio-pricing-catalog-meta";
import type { PricingProfitabilityStatus } from "@/lib/studio-pricing-profitability";

export type StudioPricingCatalogAdminEntry = {
  id: string;
  actionType: string;
  category: PricingCatalogCategory;
  displayNameNl: string;
  displayNameEn: string;
  descriptionNl: string;
  descriptionEn: string;
  creditCost: number;
  providerCostUsd: number;
  estimatedProviderCostUsd: number;
  marginEstimateUsd: number;
  marginWarning: boolean;
  profitabilityStatus: PricingProfitabilityStatus;
  revenueEur: number;
  costEur: number;
  marginEur: number;
  marginPercent: number;
  provider: string;
  active: boolean;
  isFree: boolean;
  visibleInCatalog: boolean;
  sortOrder: number;
  notes: string;
  source: "database" | "registry";
  registryDefaultCreditCost: number;
  registryDefaultProviderCostUsd: number;
  updatedAt: string | null;
  updatedByUserId: string | null;
};

export type StudioPricingCatalogPublicEntry = {
  actionType: string;
  category: PricingCatalogCategory;
  displayName: string;
  description: string;
  creditCost: number;
  sortOrder: number;
  isFree: boolean;
};

export type StudioPricingRuleUpdateInput = {
  creditCost?: number;
  providerCostUsd?: number;
  active?: boolean;
  notes?: string;
  category?: PricingCatalogCategory;
  displayNameNl?: string | null;
  displayNameEn?: string | null;
  descriptionNl?: string | null;
  descriptionEn?: string | null;
  visibleInCatalog?: boolean;
  sortOrder?: number;
  provider?: string | null;
  marginWarningThreshold?: number;
  restoreDefaults?: boolean;
};
