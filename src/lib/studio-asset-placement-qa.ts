import type { AssetReferencePlacement, PlacementQaResult } from "@/types/studio-asset-generation-workbench";
import type { GeneratedIdentityVariantAudit } from "@/types/studio-asset-identity-variant-audit";

export function auditReferencePlacements(params: {
  placements: AssetReferencePlacement[];
  generatedPrompt?: string;
  variantAudit?: GeneratedIdentityVariantAudit | null;
}): PlacementQaResult {
  const { placements, generatedPrompt = "", variantAudit } = params;
  if (placements.length === 0) {
    return { placementAccuracy: 100, brandAccuracy: 100, referenceAccuracy: 100, items: [] };
  }

  const promptLower = generatedPrompt.toLowerCase();
  const items = placements.map((placement) => {
    const label = `${placement.placementType} — ${placement.sourceName}`;
    const nameInPrompt = promptLower.includes(placement.sourceName.toLowerCase());
    const typeInPrompt = promptLower.includes(placement.placementType);
    const exactRequired = placement.importance === "exact" || placement.importance === "required";

    if (!nameInPrompt && !typeInPrompt) {
      return {
        placementId: placement.id,
        label,
        status: "fail" as const,
        messageKey: "studio.workbench.placementQa.missing",
      };
    }
    if (exactRequired && (variantAudit?.brandScore ?? 100) < 75) {
      return {
        placementId: placement.id,
        label,
        status: "warning" as const,
        messageKey: "studio.workbench.placementQa.distorted",
      };
    }
    return {
      placementId: placement.id,
      label,
      status: "pass" as const,
      messageKey: "studio.workbench.placementQa.visible",
    };
  });

  const passCount = items.filter((i) => i.status === "pass").length;
  const warnCount = items.filter((i) => i.status === "warning").length;
  const placementAccuracy = Math.round((passCount / items.length) * 100);
  const brandAccuracy = variantAudit?.brandScore ?? placementAccuracy;
  const referenceAccuracy = Math.round(((passCount + warnCount * 0.5) / items.length) * 100);

  return { placementAccuracy, brandAccuracy, referenceAccuracy, items };
}

export function mergePlacementQaIntoVariantAudit(
  audit: GeneratedIdentityVariantAudit,
  placementQa: PlacementQaResult
): GeneratedIdentityVariantAudit {
  if (placementQa.items.length === 0) {
    return audit;
  }
  const warnings = placementQa.items
    .filter((i) => i.status !== "pass")
    .map((i) => ({
      id: `placement_${i.placementId}`,
      kind: "warning" as const,
      messageKey: i.messageKey,
      detail: i.label,
    }));
  return {
    ...audit,
    warningItems: [...audit.warningItems, ...warnings],
    recommendations:
      placementQa.placementAccuracy < 80
        ? [...audit.recommendations, "studio.workbench.placementQa.recommendRegenerate"]
        : audit.recommendations,
  };
}
