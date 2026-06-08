import {
  propIdentityCompletenessTier,
  type PropIdentityFormValues,
} from "@/lib/studio-prop-identity-fields";
import type { StudioWorldProfileListItem } from "@/types/studio-api";

export type PropReadinessDomainId =
  | "identity"
  | "visualStyle"
  | "references"
  | "world"
  | "usage"
  | "continuity";

export type PropReadinessStatus = "pass" | "warning" | "missing";

export type PropReadinessDomain = {
  id: PropReadinessDomainId;
  labelKey: string;
  status: PropReadinessStatus;
  detailKey?: string;
};

export type PropReadinessView = {
  domains: PropReadinessDomain[];
  overallScore: number;
  overallTier: "complete" | "almost" | "missing";
  nextStepKey: string;
};

export type PropReadinessInput = {
  identity: PropIdentityFormValues;
  referenceImageUrl: string;
  worlds: StudioWorldProfileListItem[];
  mode: "create" | "edit";
};

function status(passed: boolean, weak: boolean): PropReadinessStatus {
  if (passed) return "pass";
  return weak ? "warning" : "missing";
}

function scorePropIdentity(identity: PropIdentityFormValues, hasReference: boolean): number {
  let score = 0;
  if (identity.name.trim()) score += 20;
  if (identity.description.trim()) score += 15;
  if (identity.propType) score += 15;
  if (identity.styleId) score += 15;
  if (identity.material || identity.colorTheme) score += 10;
  if (identity.usageContext.trim()) score += 10;
  if (identity.worldProfileId) score += 10;
  if (hasReference) score += 15;
  return Math.min(100, score);
}

export function buildPropReadinessView(input: PropReadinessInput): PropReadinessView {
  const { identity } = input;
  const score = scorePropIdentity(identity, Boolean(input.referenceImageUrl.trim()));
  const tier = propIdentityCompletenessTier(score);

  const domains: PropReadinessDomain[] = [
    {
      id: "identity",
      labelKey: "studio.assetReadiness.domain.identity",
      status: status(Boolean(identity.name.trim() && identity.description.trim()), Boolean(identity.name.trim())),
    },
    {
      id: "visualStyle",
      labelKey: "studio.assetReadiness.domain.visualStyle",
      status: status(Boolean(identity.propType && identity.styleId), Boolean(identity.propType || identity.styleId)),
    },
    {
      id: "references",
      labelKey: "studio.assetReadiness.domain.references",
      status: status(
        input.mode === "edit" ? Boolean(input.referenceImageUrl.trim()) : Boolean(input.referenceImageUrl.trim()),
        false
      ),
      detailKey:
        input.mode === "create" && !input.referenceImageUrl.trim()
          ? "studio.assetReadiness.detail.referenceRecommended"
          : undefined,
    },
    {
      id: "world",
      labelKey: "studio.assetReadiness.domain.world",
      status: status(Boolean(identity.worldProfileId), Boolean(identity.usageContext.trim())),
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
        Boolean(identity.forbiddenElements.trim() || identity.appearanceMemory.trim()),
        Boolean(identity.appearanceMemory.trim())
      ),
    },
  ];

  const missing = domains.filter((d) => d.status === "missing");
  const nextStepKey =
    missing[0]?.id === "identity"
      ? "studio.propReadiness.next.identity"
      : missing[0]?.id === "visualStyle"
        ? "studio.propReadiness.next.visualStyle"
        : missing[0]?.id === "references"
          ? "studio.propReadiness.next.reference"
          : missing[0]?.id === "world"
            ? "studio.propReadiness.next.world"
            : "studio.propReadiness.next.ready";

  return {
    domains,
    overallScore: score,
    overallTier: tier,
    nextStepKey,
  };
}
