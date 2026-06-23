/**
 * Sprint K0 — Vision data audit reports (no new vision calls).
 */

import { buildVisibleEditorPartsTreeFromDocument } from "@/lib/build-visible-editor-parts-tree";
import { listInstructionObjectsV2 } from "@/lib/editor-instruction-object-v2";
import {
  buildVisionTargetTreeFromDocument,
  flattenSelectableTargets,
} from "@/lib/vision-target-picker-v2";
import { BRAND_QA_WORKFLOW_TYPES } from "@/types/brand-qa-analytics";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type {
  VisionSourceAuditEntry,
  VisionSourceAuditReport,
  VisionTargetOpportunityReport,
  VisionTargetOpportunityRow,
  VisionTreeConsistencyReport,
  VisionTreeConsistencyRow,
  VisionWorkflowCoverageReport,
  VisionWorkflowCoverageRow,
} from "@/types/vision-target-picker";

const VISION_WORKFLOWS = [
  ...BRAND_QA_WORKFLOW_TYPES,
  "motion_branding",
] as const;

const OPPORTUNITY_CATEGORIES: Array<{
  category: string;
  patterns: RegExp;
}> = [
  { category: "Kleding", patterns: /shirt|sleeve|chest|collar|jacket|clothing/i },
  { category: "Voertuigen", patterns: /vehicle|door|hood|truck|van|car/i },
  { category: "Verpakking", patterns: /pack|carton|box|label/i },
  { category: "Producten", patterns: /product|bottle|jar|can/i },
  { category: "Billboards", patterns: /billboard/i },
  { category: "Posters", patterns: /poster/i },
  { category: "Signage", patterns: /sign|signage/i },
  { category: "Schermen", patterns: /screen|display/i },
  { category: "Mascots", patterns: /mascot|emblem|badge/i },
];

function countIf<T>(rows: T[] | undefined): number {
  return rows?.length ?? 0;
}

export function buildVisionSourceAuditReport(document: EditorCanvasDocument): VisionSourceAuditReport {
  const merged = document.visionV6Meta?.mergedAnalysisParts ?? [];
  const hierarchy = document.visionHierarchy ?? [];
  const detected = document.detectedObjects ?? [];
  const semantic = document.semanticLayers ?? [];
  const handoff = document.studioMotionHandoff;
  const visible = buildVisibleEditorPartsTreeFromDocument(document);

  const sources: VisionSourceAuditEntry[] = [
    {
      source: "rtdetr",
      populated: (document.visionV6Meta?.rtdetrCount ?? 0) > 0 || detected.length > 0,
      storedAt: ["detectedObjects", "visionV6Meta.rtdetrCount"],
      readAt: ["buildVisibleEditorPartsTree", "editor-instruction-object-feed"],
      displayedAt: ["EditorVisionHierarchyPanel"],
      lostAt: detected.length > 0 && visible.debug.visibleTreeNodeCount < detected.length ? ["dedupeParts", "truthModeFilter"] : [],
      workflows: ["logo_placement", "product_branding"],
      count: document.visionV6Meta?.rtdetrCount ?? detected.length,
    },
    {
      source: "mergedAnalysisParts",
      populated: merged.length > 0,
      storedAt: ["visionV6Meta.mergedAnalysisParts"],
      readAt: ["buildVisibleEditorPartsTree", "vision-target-picker-v2"],
      displayedAt: ["EditorVisionPartsPanel", "EditorVisionTargetPickerV2"],
      lostAt:
        merged.length > visible.debug.visibleTreeNodeCount
          ? ["noiseFilter", "evidenceAudit", "taxonomyGrouping"]
          : [],
      workflows: ["logo_placement", "product_branding", "mascot_transform"],
      count: merged.length,
    },
    {
      source: "visionHierarchy",
      populated: hierarchy.length > 0,
      storedAt: ["visionHierarchy"],
      readAt: ["resolveDisplayVisionHierarchy", "vision-target-picker-v2"],
      displayedAt: ["EditorVisionHierarchyPanel"],
      lostAt: ["stickyHierarchyMayHideRicherProvisional"],
      workflows: VISION_WORKFLOWS as unknown as string[],
      count: hierarchy.length,
    },
    {
      source: "selectionShape",
      populated: document.objects.some((layer) => Boolean(layer.selectionShape)),
      storedAt: ["objects[].selectionShape"],
      readAt: ["resolveEditorSelectionGeometry", "logo-placement-blueprint"],
      displayedAt: ["EditorPropertiesPanel"],
      lostAt: ["localStorageMaskDataStrip", "missingSam2UntilSegmented"],
      workflows: ["logo_placement", "product_branding"],
      count: document.objects.filter((layer) => layer.selectionShape).length,
    },
    {
      source: "BrandLockedAsset",
      populated: Boolean((document as Record<string, unknown>).studioHandoffJson),
      storedAt: ["studioHandoffJson.brandLockedAssets"],
      readAt: ["brand-asset-motion-lock", "motion-lock-segment-service"],
      displayedAt: ["MotionLockValidationPanel"],
      lostAt: [],
      workflows: ["motion_branding"],
      count: 0,
    },
    {
      source: "motionPreparations",
      populated: countIf(document.motionPreparations) > 0,
      storedAt: ["motionPreparations", "studioMotionHandoff.motionPreparations"],
      readAt: ["editor-studio-motion-handoff"],
      displayedAt: [],
      lostAt: ["notCopiedToMotionHandoffPayload"],
      workflows: ["motion_branding"],
      count: countIf(document.motionPreparations),
    },
  ];

  return {
    sources,
    generatedAt: new Date().toISOString(),
  };
}

const WORKFLOW_VISION_USAGE: Record<string, { used: string[]; ignored: string[] }> = {
  product_branding: {
    used: ["mergedAnalysisParts", "selectionShape", "targetBounds", "quad"],
    ignored: ["motionPreparations", "styleTraits"],
  },
  logo_placement: {
    used: ["mergedAnalysisParts", "visionHierarchy", "polygon", "maskUrl", "quad"],
    ignored: ["semanticLayersOnly", "styleTraits"],
  },
  product_packaging: {
    used: ["mergedAnalysisParts", "targetBounds", "quad"],
    ignored: ["motionPreparations"],
  },
  mascot_transform: {
    used: ["mergedAnalysisParts", "reference_asset"],
    ignored: ["polygon", "densePartTree"],
  },
  motion_branding: {
    used: ["BrandLockedAsset", "targetBounds", "quad", "motionLockReport"],
    ignored: ["fullVisionHierarchy", "mergedAnalysisParts"],
  },
};

export function buildVisionWorkflowCoverageReport(
  document?: EditorCanvasDocument
): VisionWorkflowCoverageReport {
  const available = new Set<string>();
  if (document) {
    if ((document.visionV6Meta?.mergedAnalysisParts?.length ?? 0) > 0) {
      available.add("mergedAnalysisParts");
    }
    if ((document.visionHierarchy?.length ?? 0) > 0) {
      available.add("visionHierarchy");
    }
    if (document.objects.some((layer) => layer.selectionShape?.polygon)) {
      available.add("polygon");
    }
    if (document.objects.some((layer) => layer.selectionShape?.maskUrl)) {
      available.add("maskUrl");
    }
  }

  const workflows: VisionWorkflowCoverageRow[] = VISION_WORKFLOWS.map((workflow) => {
    const row = WORKFLOW_VISION_USAGE[workflow] ?? { used: [], ignored: [] };
    const canUse = [...available].filter((item) => !row.ignored.includes(item));
    return {
      workflow,
      used: row.used,
      ignored: row.ignored,
      available: canUse,
      recommendation:
        canUse.length > row.used.length
          ? "additional_existing_vision_data_available"
          : "current_mapping_sufficient",
    };
  });

  return { workflows, generatedAt: new Date().toISOString() };
}

export function buildVisionTreeConsistencyReport(
  document: EditorCanvasDocument
): VisionTreeConsistencyReport {
  const visible = buildVisibleEditorPartsTreeFromDocument(document);
  const instructionObjects = listInstructionObjectsV2(document);
  const targetTree = buildVisionTargetTreeFromDocument(document);
  const selectable = flattenSelectableTargets(targetTree.roots);

  const rows: VisionTreeConsistencyRow[] = [
    {
      nodeType: "mergedAnalysisParts",
      treeUses: visible.debug.mergedAnalysisPartLabels.slice(0, 8),
      brandingUses: instructionObjects.map((obj) => obj.label).slice(0, 8),
      fusionUses: instructionObjects.filter((obj) => obj.category !== "background").map((o) => o.label).slice(0, 8),
      motionUses: ["BrandLockedAsset.targetBounds"],
      mismatch: visible.debug.mergedAnalysisPartLabels.length > instructionObjects.length,
      notes:
        visible.debug.mergedAnalysisPartLabels.length > instructionObjects.length
          ? "Part labels collapse in instruction object feed"
          : "aligned",
    },
    {
      nodeType: "visionHierarchy",
      treeUses: visible.debug.visibleLeafLabels.slice(0, 8),
      brandingUses: selectable.map((node) => node.label).slice(0, 8),
      fusionUses: selectable.map((node) => node.label).slice(0, 8),
      motionUses: selectable.filter((node) => node.motionEligible).map((node) => node.label),
      mismatch: visible.debug.visibleLeafLabels.length !== selectable.length,
      notes: `datasource=${visible.debug.datasourceUsed}`,
    },
    {
      nodeType: "polygon/mask",
      treeUses: document.objects
        .filter((layer) => layer.selectionShape?.polygon || layer.selectionShape?.maskUrl)
        .map((layer) => layer.label ?? layer.id),
      brandingUses: selectable
        .filter((node) => node.geometry?.priority === "polygon" || node.geometry?.priority === "mask")
        .map((node) => node.label),
      fusionUses: selectable.map((node) => node.geometry?.priority ?? "bbox"),
      motionUses: ["post_composite", "quad_interpolation"],
      mismatch: false,
      notes: "geometry priority polygon → mask → quad → bbox",
    },
  ];

  return { rows, generatedAt: new Date().toISOString() };
}

export function buildVisionTargetOpportunityReport(
  document: EditorCanvasDocument
): VisionTargetOpportunityReport {
  const mergedLabels = (document.visionV6Meta?.mergedAnalysisParts ?? []).map((part) => part.label);
  const visibleLabels = buildVisibleEditorPartsTreeFromDocument(document).debug.visibleLeafLabels;
  const usedLabels = flattenSelectableTargets(buildVisionTargetTreeFromDocument(document).roots).map(
    (node) => node.rawLabel
  );

  const categories: VisionTargetOpportunityRow[] = OPPORTUNITY_CATEGORIES.map(({ category, patterns }) => {
    const available = mergedLabels.filter((label) => patterns.test(label));
    const visible = visibleLabels.filter((label) => patterns.test(label));
    const used = usedLabels.filter((label) => patterns.test(label));
    const notVisible = available.filter((label) => !visible.includes(label));
    const notUsed = visible.filter((label) => !used.includes(label));

    return {
      category,
      available,
      notVisible,
      notUsed,
    };
  });

  return { categories, generatedAt: new Date().toISOString() };
}
