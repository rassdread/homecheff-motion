import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetReferencePlacement, PlacementSuggestion } from "@/types/studio-asset-generation-workbench";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";

export function createEmptyReferencePlacement(): AssetReferencePlacement {
  return {
    id: crypto.randomUUID(),
    assetId: null,
    storageKey: "",
    previewUrl: "",
    sourceName: "",
    placementType: "logo",
    placementTarget: "apron_center",
    size: "medium",
    importance: "high_priority",
    locked: false,
  };
}

export function shouldShowReferencePlacementStep(draft: AssetWizardDraft): boolean {
  return Boolean(draft.sourceVisionAnalysis) && draft.kind === "character";
}

export function canAdvanceFromReferencePlacementStep(draft: AssetWizardDraft): boolean {
  if (!shouldShowReferencePlacementStep(draft)) {
    return true;
  }
  if (draft.referencePlacements.length === 0) {
    return true;
  }
  return draft.referencePlacements.every(
    (p) =>
      p.previewUrl.trim() &&
      p.sourceName.trim() &&
      (p.placementTarget !== "custom" || Boolean(p.placementTargetCustom?.trim()))
  );
}

export function buildPlacementPromptBlock(placements: AssetReferencePlacement[]): string {
  if (placements.length === 0) {
    return "";
  }
  const lines = placements.map((p) => {
    const target = p.placementTarget === "custom" ? p.placementTargetCustom : p.placementTarget.replace(/_/g, " ");
    const exactness =
      p.importance === "exact" || p.importance === "required"
        ? "Use this uploaded asset as an exact placement reference. Do not invent a similar design. Do not distort text or brand marks. Preserve the provided design as closely as possible."
        : "Place this reference as accurately as possible.";
    return [
      `Placement reference: ${p.sourceName} (${p.placementType}).`,
      `Target: ${target} (${p.size} size).`,
      `Importance: ${p.importance.replace(/_/g, " ")}.`,
      p.objectTarget ? `On object: ${p.objectTarget.objectLabel}.` : "",
      exactness,
    ]
      .filter(Boolean)
      .join(" ");
  });
  return lines.join(" ");
}

export function buildSmartPlacementSuggestions(vision: AssetVisionAnalysis): PlacementSuggestion[] {
  const text = [
    vision.objectTypeLabel,
    ...vision.keyFeatures,
    vision.identityFingerprint.accessoryPattern ?? "",
  ]
    .join(" ")
    .toLowerCase();
  const suggestions: PlacementSuggestion[] = [];

  if (/apron|chef|character|mascot/.test(text)) {
    suggestions.push({
      id: "suggest_apron_logo",
      messageKey: "studio.workbench.placement.suggest.apronLogo",
      placementType: "logo",
      suggestedTarget: "apron_center",
      confidence: 0.82,
    });
  }
  if (/hat|cap|chef/.test(text)) {
    suggestions.push({
      id: "suggest_hat_badge",
      messageKey: "studio.workbench.placement.suggest.hatBadge",
      placementType: "badge",
      suggestedTarget: "hat_front",
      confidence: 0.78,
    });
  }
  if (/box|packaging|package|label/.test(text)) {
    suggestions.push({
      id: "suggest_box_label",
      messageKey: "studio.workbench.placement.suggest.boxLabel",
      placementType: "label",
      suggestedTarget: "packaging_front",
      confidence: 0.8,
    });
  }
  if (/poster|background|banner/.test(text)) {
    suggestions.push({
      id: "suggest_bg_poster",
      messageKey: "studio.workbench.placement.suggest.backgroundPoster",
      placementType: "poster",
      suggestedTarget: "background_poster",
      confidence: 0.7,
    });
  }
  return suggestions;
}

export function placementBlocksHardDelete(placementSources: string[], assetId: string): boolean {
  return placementSources.includes(assetId);
}

export function semanticRecordUsesPlacementSource(
  record: { referencePlacements?: AssetReferencePlacement[] } | null | undefined,
  params: { assetId: string; storageKey?: string | null }
): boolean {
  if (!record?.referencePlacements?.length) {
    return false;
  }
  const storageKey = params.storageKey?.trim() ?? "";
  return record.referencePlacements.some(
    (placement) =>
      (params.assetId && placement.assetId === params.assetId) ||
      (storageKey.length > 0 && placement.storageKey === storageKey)
  );
}

export function formatPlacementSummary(placement: AssetReferencePlacement): string {
  const target =
    placement.placementTarget === "custom"
      ? placement.placementTargetCustom
      : placement.placementTarget.replace(/_/g, " ");
  return `${placement.placementType} on ${target} (${placement.sourceName})`;
}
