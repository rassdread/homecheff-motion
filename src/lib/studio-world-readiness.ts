import {
  worldIdentityCompletenessTier,
  type WorldIdentityFormValues,
} from "@/lib/studio-world-identity-fields";

export type WorldReadinessDomainId =
  | "identity"
  | "visualStyle"
  | "references"
  | "usage"
  | "continuity";

export type WorldReadinessStatus = "pass" | "warning" | "missing";

export type WorldReadinessDomain = {
  id: WorldReadinessDomainId;
  labelKey: string;
  status: WorldReadinessStatus;
  detailKey?: string;
};

export type WorldReadinessView = {
  domains: WorldReadinessDomain[];
  overallScore: number;
  overallTier: "complete" | "almost" | "missing";
  nextStepKey: string;
};

export type WorldReadinessInput = {
  identity: WorldIdentityFormValues;
  mode: "create" | "edit";
};

function status(passed: boolean, weak: boolean): WorldReadinessStatus {
  if (passed) return "pass";
  return weak ? "warning" : "missing";
}

function scoreWorldIdentity(identity: WorldIdentityFormValues): number {
  let score = 0;
  if (identity.name.trim()) score += 25;
  if (identity.description.trim()) score += 20;
  if (identity.worldType) score += 20;
  if (identity.visualStyle) score += 15;
  if (identity.usageContext.trim()) score += 10;
  if (identity.brandRules.trim() || identity.forbiddenElements.trim()) score += 10;
  return Math.min(100, score);
}

export function buildWorldReadinessView(input: WorldReadinessInput): WorldReadinessView {
  const { identity } = input;
  const score = scoreWorldIdentity(identity);
  const tier = worldIdentityCompletenessTier(score);

  const domains: WorldReadinessDomain[] = [
    {
      id: "identity",
      labelKey: "studio.assetReadiness.domain.identity",
      status: status(Boolean(identity.name.trim() && identity.description.trim()), Boolean(identity.name.trim())),
    },
    {
      id: "visualStyle",
      labelKey: "studio.assetReadiness.domain.visualStyle",
      status: status(Boolean(identity.worldType && identity.visualStyle), Boolean(identity.worldType)),
    },
    {
      id: "references",
      labelKey: "studio.assetReadiness.domain.references",
      status: "warning",
      detailKey: "studio.worldReadiness.detail.noVisualReference",
    },
    {
      id: "usage",
      labelKey: "studio.assetReadiness.domain.usage",
      status: status(Boolean(identity.usageContext.trim()), false),
    },
    {
      id: "continuity",
      labelKey: "studio.assetReadiness.domain.continuity",
      status: status(
        Boolean(identity.brandRules.trim() || identity.forbiddenElements.trim()),
        Boolean(identity.brandRules.trim())
      ),
    },
  ];

  const missing = domains.filter((d) => d.status === "missing");
  const nextStepKey =
    missing[0]?.id === "identity"
      ? "studio.worldReadiness.next.identity"
      : missing[0]?.id === "visualStyle"
        ? "studio.worldReadiness.next.visualStyle"
        : "studio.worldReadiness.next.ready";

  return {
    domains,
    overallScore: score,
    overallTier: tier,
    nextStepKey,
  };
}
