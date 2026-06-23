import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildVisionSourceAuditReport,
  buildVisionTargetOpportunityReport,
  buildVisionTreeConsistencyReport,
  buildVisionWorkflowCoverageReport,
} from "@/lib/vision-target-picker-audit";
import { buildVisionTargetTreeFromDocument, flattenSelectableTargets } from "@/lib/vision-target-picker-v2";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { IllustrationPartSpec } from "@/types/editor-illustration-parts";

function part(
  input: Pick<IllustrationPartSpec, "key" | "label"> &
    Partial<Omit<IllustrationPartSpec, "key" | "label">>
): IllustrationPartSpec {
  return {
    category: "clothing",
    group: "clothing",
    bbox: { x: 0.3, y: 0.35, width: 0.4, height: 0.35 },
    source: "rtdetr",
    confidence: 0.9,
    editable: true,
    ...input,
  };
}

function shirtDocument(): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_vision_audit",
    name: "shirt.jpg",
    sourceKind: "character",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/shirt.jpg",
    workflowStep: "visual_editor",
    objects: [],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
    visionV6Meta: {
      mergedAnalysisParts: [
        part({ key: "shirt", label: "Shirt", category: "clothing" }),
        part({
          key: "left_sleeve",
          label: "left_sleeve",
          category: "clothing",
          bbox: { x: 0.15, y: 0.4, width: 0.15, height: 0.25 },
        }),
        part({
          key: "chest_left",
          label: "chest_left",
          category: "clothing",
          bbox: { x: 0.35, y: 0.4, width: 0.12, height: 0.15 },
        }),
        part({
          key: "front_panel",
          label: "front_panel",
          category: "packaging",
          bbox: { x: 0.5, y: 0.5, width: 0.2, height: 0.2 },
        }),
      ],
      taxonomyType: "human",
      openAiPartsUsed: true,
    },
  };
}

describe("vision target picker audit (Sprint K0)", () => {
  it("builds source audit with mergedAnalysisParts populated", () => {
    const doc = shirtDocument();
    const report = buildVisionSourceAuditReport(doc);
    const merged = report.sources.find((row) => row.source === "mergedAnalysisParts");
    assert.ok(merged);
    assert.equal(merged.populated, true);
    assert.ok((merged.count ?? 0) >= 4);
    assert.ok(merged.readAt.includes("vision-target-picker-v2"));
  });

  it("builds workflow coverage for branding and motion", () => {
    const report = buildVisionWorkflowCoverageReport(shirtDocument());
    const branding = report.workflows.find((row) => row.workflow === "product_branding");
    const motion = report.workflows.find((row) => row.workflow === "motion_branding");
    assert.ok(branding);
    assert.ok(motion);
    assert.ok(branding.used.includes("mergedAnalysisParts"));
    assert.ok(motion.used.includes("BrandLockedAsset"));
  });

  it("reports tree consistency and target opportunities", () => {
    const doc = shirtDocument();
    const treeReport = buildVisionTreeConsistencyReport(doc);
    assert.ok(treeReport.rows.length >= 2);
    const hierarchyRow = treeReport.rows.find((row) => row.nodeType === "visionHierarchy");
    assert.ok(hierarchyRow);

    const opportunity = buildVisionTargetOpportunityReport(doc);
    const clothing = opportunity.categories.find((row) => row.category === "Kleding");
    assert.ok(clothing);
    assert.ok(clothing.available.length > 0);
  });

  it("exposes child targets in picker tree when parts exist", () => {
    const tree = buildVisionTargetTreeFromDocument(shirtDocument());
    const labels = flattenSelectableTargets(tree.roots).map((node) => node.label);
    assert.ok(labels.includes("Mouw links") || labels.includes("Shirt"));
    assert.ok(tree.totalSelectable > 0);
  });
});
