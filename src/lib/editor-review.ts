import { buildEditorSavePayload, type EditorSavePayload } from "@/lib/editor-canvas-export";
import { documentSupportsBodyDesigner } from "@/lib/editor-body-designer";
import { auditEditorPlacements } from "@/lib/editor-placement-qa";
import { extractEditorSemanticLayers } from "@/lib/editor-canvas-layers";
import type { EditorCanvasDocument, EditorSourceKind } from "@/types/homecheff-visual-editor";

export type EditorReviewWarning = {
  id: string;
  severity: "info" | "warning" | "error";
  messageKey: string;
  params?: Record<string, string>;
};

export type EditorReviewSummary = {
  sessionId: string;
  name: string;
  assetType: EditorSourceKind;
  lineageLabel: string;
  identityScore: number;
  placementScore: number;
  semanticLayerCount: number;
  placementCount: number;
  bodyDesignerSummary: string | null;
  saveDestination: "library" | "draft" | "canonical_base" | "animation_ready";
  warnings: EditorReviewWarning[];
  payload: EditorSavePayload;
};

function computeIdentityScore(document: EditorCanvasDocument): number {
  const layers = document.semanticLayers ?? extractEditorSemanticLayers(document.objects);
  const markers = layers.filter((l) => l.metadata?.identityRelevance === "identity_marker");
  const lockedMarkers = markers.filter((l) => l.locked).length;
  const base = markers.length > 0 ? 70 + (lockedMarkers / markers.length) * 25 : 85;
  const protectedLayers = layers.filter((l) => l.metadata?.identityRelevance === "protected_brand_element");
  const bonus = protectedLayers.length > 0 ? 5 : 0;
  return Math.min(100, Math.round(base + bonus));
}

function computePlacementScore(document: EditorCanvasDocument): number {
  const qa = auditEditorPlacements(document);
  if (document.placements.length === 0) {
    return 100;
  }
  const total = qa.passCount + qa.warningCount + qa.failCount;
  if (total === 0) {
    return 100;
  }
  return Math.round(((qa.passCount + qa.warningCount * 0.5) / total) * 100);
}

function resolveSaveDestination(document: EditorCanvasDocument): EditorReviewSummary["saveDestination"] {
  if (document.sourceKind === "canonical") {
    return "canonical_base";
  }
  if (document.sourceKind === "character" && document.bodyDesigner) {
    return "animation_ready";
  }
  return "library";
}

function resolveLineageLabel(document: EditorCanvasDocument): string {
  if (document.sourceKind === "canonical") {
    return "canonical_character_base";
  }
  if (document.sourceKind === "character") {
    return document.bodyDesigner ? "animation_ready_character" : "character";
  }
  if (document.sourceAssetId) {
    return "edited_copy";
  }
  return document.sourceKind;
}

export function buildEditorReviewSummary(document: EditorCanvasDocument): EditorReviewSummary {
  const payload = buildEditorSavePayload(document);
  const placementQa = auditEditorPlacements(document);
  const warnings: EditorReviewWarning[] = [];

  for (const item of placementQa.items) {
    if (item.status !== "pass") {
      warnings.push({
        id: `placement-${item.placementId}`,
        severity: item.status === "fail" ? "error" : "warning",
        messageKey: item.messageKey,
      });
    }
  }

  const protectedUnlocked = document.objects.filter(
    (l) => l.metadata?.identityRelevance === "identity_marker" && !l.locked
  );
  if (protectedUnlocked.length > 0) {
    warnings.push({
      id: "identity-unlocked",
      severity: "warning",
      messageKey: "editor.review.warning.identityUnlocked",
      params: { count: String(protectedUnlocked.length) },
    });
  }

  const bodyDesignerSummary =
    document.bodyDesigner && documentSupportsBodyDesigner(document)
      ? `${document.bodyDesigner.stylizationPreset} · head ${Math.round(document.bodyDesigner.headScale * 100)}%`
      : null;

  return {
    sessionId: document.sessionId,
    name: document.name,
    assetType: document.sourceKind,
    lineageLabel: resolveLineageLabel(document),
    identityScore: computeIdentityScore(document),
    placementScore: computePlacementScore(document),
    semanticLayerCount: payload.semanticLayers.filter((l) => l.type !== "background").length,
    placementCount: document.placements.length,
    bodyDesignerSummary,
    saveDestination: resolveSaveDestination(document),
    warnings,
    payload,
  };
}

export function editorReviewStepReady(document: EditorCanvasDocument): boolean {
  return document.status === "editing" || document.status === "draft_saved";
}
