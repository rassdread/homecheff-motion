import {
  locationIdentityCompletenessTier,
  type LocationIdentityFormValues,
} from "@/lib/studio-location-identity-fields";
import type { StudioWorldProfileListItem } from "@/types/studio-api";

export type LocationReadinessDomainId =
  | "identity"
  | "visualStyle"
  | "references"
  | "world"
  | "usage"
  | "continuity";

export type LocationReadinessStatus = "pass" | "warning" | "missing";

export type LocationReadinessDomain = {
  id: LocationReadinessDomainId;
  labelKey: string;
  status: LocationReadinessStatus;
  detailKey?: string;
};

export type LocationReadinessView = {
  domains: LocationReadinessDomain[];
  overallScore: number;
  overallTier: "complete" | "almost" | "missing";
  nextStepKey: string;
};

export type LocationReadinessInput = {
  identity: LocationIdentityFormValues;
  referenceImageUrl: string;
  worlds: StudioWorldProfileListItem[];
  mode: "create" | "edit";
};

function status(passed: boolean, weak: boolean): LocationReadinessStatus {
  if (passed) return "pass";
  return weak ? "warning" : "missing";
}

function scoreLocationIdentity(identity: LocationIdentityFormValues, hasReference: boolean): number {
  let score = 0;
  if (identity.name.trim()) score += 20;
  if (identity.description.trim()) score += 15;
  if (identity.locationType) score += 20;
  if (identity.visualStyle) score += 15;
  if (identity.mood || identity.architecture) score += 10;
  if (identity.usageContext.trim()) score += 10;
  if (identity.worldProfileId) score += 10;
  if (hasReference) score += 15;
  return Math.min(100, score);
}

export function buildLocationReadinessView(input: LocationReadinessInput): LocationReadinessView {
  const { identity } = input;
  const score = scoreLocationIdentity(identity, Boolean(input.referenceImageUrl.trim()));
  const tier = locationIdentityCompletenessTier(score);

  const domains: LocationReadinessDomain[] = [
    {
      id: "identity",
      labelKey: "studio.assetReadiness.domain.identity",
      status: status(Boolean(identity.name.trim() && identity.description.trim()), Boolean(identity.name.trim())),
    },
    {
      id: "visualStyle",
      labelKey: "studio.assetReadiness.domain.visualStyle",
      status: status(Boolean(identity.locationType && identity.visualStyle), Boolean(identity.locationType)),
    },
    {
      id: "references",
      labelKey: "studio.assetReadiness.domain.references",
      status: status(Boolean(input.referenceImageUrl.trim()), false),
      detailKey: !input.referenceImageUrl.trim() ? "studio.assetReadiness.detail.referenceRecommended" : undefined,
    },
    {
      id: "world",
      labelKey: "studio.assetReadiness.domain.world",
      status: status(Boolean(identity.worldProfileId), Boolean(identity.worldMemory.trim())),
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
        Boolean(identity.forbiddenElements.trim() || identity.materials.trim()),
        Boolean(identity.materials.trim())
      ),
    },
  ];

  const missing = domains.filter((d) => d.status === "missing");
  const nextStepKey =
    missing[0]?.id === "identity"
      ? "studio.locationReadiness.next.identity"
      : missing[0]?.id === "visualStyle"
        ? "studio.locationReadiness.next.visualStyle"
        : missing[0]?.id === "references"
          ? "studio.locationReadiness.next.reference"
          : "studio.locationReadiness.next.ready";

  return {
    domains,
    overallScore: score,
    overallTier: tier,
    nextStepKey,
  };
}
