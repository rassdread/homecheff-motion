import type { EditorSavePayload } from "@/lib/editor-canvas-export";
import type { EditorSourceKind } from "@/types/homecheff-visual-editor";
import type { AssetSemanticRecord } from "@/types/studio-asset-semantic-record";
import { CANONICAL_CHARACTER_BASE_ASSET_TYPE } from "@/lib/studio-asset-character-evolution";
import { ASSET_SEMANTIC_RECORD_VERSION } from "@/types/studio-asset-semantic-record";

export function buildEditorMergedSemanticRecord(params: {
  payload: EditorSavePayload;
  mode: string;
  existing?: AssetSemanticRecord | null;
  sourceKind: EditorSourceKind;
}): AssetSemanticRecord {
  const { payload, mode, existing, sourceKind } = params;
  const patch = payload.semanticRecordPatch;
  const now = new Date().toISOString();
  const layerLabels = payload.semanticLayers.filter((l) => l.type !== "background").map((l) => l.label);

  const record: AssetSemanticRecord = {
    version: ASSET_SEMANTIC_RECORD_VERSION,
    ...existing,
    ...patch,
    updatedAt: now,
    referencePlacements: payload.referencePlacements,
    keyFeatures: [...(patch.keyFeatures ?? existing?.keyFeatures ?? []), ...layerLabels].filter(
      (v, i, arr) => arr.indexOf(v) === i
    ),
    preserveRules: patch.preserveRules ?? existing?.preserveRules,
    changeRules: patch.changeRules ?? existing?.changeRules,
    continuityNotes: [
      patch.continuityNotes,
      payload.compositionSummary ? `Composition: ${payload.compositionSummary}` : "",
      payload.compositionGraph.length > 0
        ? `Graph: ${payload.compositionGraph.map((n) => n.label).join(" → ")}`
        : "",
    ]
      .filter(Boolean)
      .join(" | "),
  };

  if (payload.bodyDesignerProfile) {
    record.characterConstructionProfile =
      patch.characterConstructionProfile ?? record.characterConstructionProfile;
  }

  if (mode === "canonical_base") {
    record.identityAssetType = CANONICAL_CHARACTER_BASE_ASSET_TYPE;
  }

  if (mode === "animation_ready") {
    record.animationReadinessScore = Math.max(record.animationReadinessScore ?? 0, 85);
    record.animationPreparationActions = [
      ...(record.animationPreparationActions ?? []),
      "editor_body_designer",
      "standard_pose",
    ];
  } else if (record.characterConstructionProfile) {
    record.animationReadinessScore = Math.max(record.animationReadinessScore ?? 0, 72);
  }

  if (mode === "edited_copy" && payload.sourceAssetId) {
    record.derivedFromAssetId = payload.sourceAssetId;
    record.parentAssetId = payload.sourceAssetId;
  }

  if (sourceKind === "product_photo" || sourceKind === "logo") {
    record.identityAssetType = sourceKind === "logo" ? "logo" : "product_photo";
  }

  return record;
}

export function resolveEditorEntityKind(sourceKind: EditorSourceKind): "character" | "prop" | "location" | "upload" {
  if (sourceKind === "product_photo" || sourceKind === "logo") {
    return "prop";
  }
  if (sourceKind === "character" || sourceKind === "canonical" || sourceKind === "upload") {
    return "character";
  }
  if (sourceKind === "generated" || sourceKind === "derived") {
    return "character";
  }
  return "upload";
}

export function resolveLibraryHref(entityKind: string, assetId: string): string {
  if (entityKind === "upload") {
    return "/library/creative/uploads";
  }
  if (entityKind === "prop") {
    return `/library/creative/props/${encodeURIComponent(assetId)}`;
  }
  if (entityKind === "location") {
    return `/library/creative/locations/${encodeURIComponent(assetId)}`;
  }
  return `/library/creative/characters/${encodeURIComponent(assetId)}`;
}
