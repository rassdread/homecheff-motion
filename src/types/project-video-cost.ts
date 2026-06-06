import type { CostAccuracy } from "@/server/provider-cost/cost-event-types";

export type ProjectVideoCostProviderEvent = {
  id: string;
  provider: string;
  actionType: string;
  status: string;
  unitsUsed: number | null;
  unitType: string;
  totalCostUsd: number | null;
  isEstimated: boolean;
  costAccuracy: CostAccuracy;
  completedAt: string | null;
  relatedJobId: string | null;
};

export type ProjectVideoCostSummary = {
  creditsUsed: number;
  grossPriceEur: number;
  netPriceEur: number;
  isAdminFree: boolean;
  isEstimated: boolean;
  costAccuracy: CostAccuracy;
  eventCount: number;
  billingEventCount: number;
  status: "pending" | "partial" | "complete";
  /** Admin-only fields */
  internalCostUsd?: number;
  internalCostEur?: number;
  marginEur?: number;
  marginPercent?: number;
  exactCostUsd?: number;
  estimatedCostUsd?: number;
  providerEvents?: ProjectVideoCostProviderEvent[];
};
