export type UserBillingRow = {
  id: string;
  createdAt: string;
  projectId: string | null;
  projectTitle: string | null;
  actionType: string;
  renderType: string;
  status: string;
  creditsUsed: number;
  netPriceEur: number;
  grossPriceEur: number;
  pricingRuleLabel: string | null;
  isEstimated: boolean;
};

export type UserUsageSummary = {
  period: "today" | "last7Days" | "last30Days" | "allTime";
  videoCount: number;
  creditsUsed: number;
  amountSpentEur: number;
  avgPricePerVideoEur: number;
};

export type CustomerUsageReport = {
  generatedAt: string;
  summary: UserUsageSummary;
  rows: UserBillingRow[];
  filter: "today" | "last7Days" | "last30Days" | "allTime";
};
