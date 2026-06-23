import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFusionDataTraceReport,
  buildFusionIntelligenceAuditReport,
  buildFusionSourceCoverageReport,
  buildFusionWorkflowCoverageMatrix,
} from "@/lib/fusion-intelligence-audit";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { stampDocumentAnalysisTier } from "@/lib/editor-vision-analysis-tier";
import { ensureFusionPlan } from "@/lib/editor-fusion-plan";

function premiumDoc() {
  let doc = createEditorDocumentFromUpload({
    name: "fusion-audit.jpg",
    backgroundUrl: "https://example.com/fusion-audit.jpg",
  });
  doc = stampDocumentAnalysisTier(doc, "premium");
  doc = {
    ...doc,
    visionAnalysis: {
      objectType: "human",
      objectTypeLabel: "Human",
      visualStyle: "Minimal Scandinavian",
      colors: [{ label: "navy", role: "primary" }],
      shapeLanguage: [],
      keyFeatures: ["blue eyes", "dark hair", "no glasses"],
      brandIdentity: "",
      materialHints: "",
      environmentHints: "studio",
      suggestedPreserve: ["face"],
      suggestedChange: [],
      suggestedForbidden: [],
      confidence: 0.92,
      safetyNotes: [],
      assetFamily: "",
      characterLineage: "",
      brandRecognitionConfidence: 0,
      identityFingerprint: {
        assetType: "human",
        shapeMarkers: [],
        colorMarkers: [],
        accessoryMarkers: [],
        brandMarkers: [],
        confidence: 0.9,
      },
    },
    visionV6Meta: {
      illustrationAnalysis: true,
      rtdetrCount: 3,
      visionPartCount: 6,
      mergedLayerCount: 6,
      openAiPartsUsed: true,
      layerSources: [],
      analysisTier: "premium",
      mergedAnalysisParts: [
        {
          key: "eyes",
          label: "Eyes",
          category: "eyes",
          group: "face",
          bbox: { x: 0.3, y: 0.3, width: 0.1, height: 0.05 },
          source: "openai_vision",
          confidence: 0.9,
          editable: true,
        },
        {
          key: "hair",
          label: "Hair",
          category: "hair",
          group: "character",
          bbox: { x: 0.25, y: 0.15, width: 0.5, height: 0.2 },
          source: "openai_vision",
          confidence: 0.88,
          editable: true,
        },
      ],
    },
  };
  return ensureFusionPlan(doc, "character_fusion");
}

describe("fusion intelligence audit (FQ0–FQ2)", () => {
  it("builds source coverage and data trace reports", () => {
    const doc = premiumDoc();
    const source = buildFusionSourceCoverageReport(doc);
    assert.ok(source.sources.some((row) => row.source === "mergedAnalysisParts" && row.populated));
    assert.ok(source.sources.some((row) => row.source === "styleDNA" && row.populated));

    const trace = buildFusionDataTraceReport({
      document: doc,
      workflow: "character_fusion",
      prompt: "HOMECHEFF FUSION BLUEPRINT test prompt with enough length",
    });
    assert.equal(trace.workflow, "character_fusion");
    assert.ok(trace.steps.some((step) => step.stage === "analysis" && step.exists));
  });

  it("builds workflow coverage matrix for audit workflows", () => {
    const matrix = buildFusionWorkflowCoverageMatrix(premiumDoc());
    assert.ok(matrix.workflows.length >= 10);
    const fusion = matrix.workflows.find((row) => row.workflow === "character_fusion");
    assert.ok(fusion?.analysisUsed);
  });

  it("builds full intelligence audit report with quality score", () => {
    const report = buildFusionIntelligenceAuditReport({ document: premiumDoc() });
    assert.ok(report.qualityScore.totalFusionQualityScore >= 0);
    assert.ok(report.qualityScore.totalFusionQualityScore <= 100);
    assert.ok(report.promptCoverage.promptCoveragePercent >= 0);
    assert.ok(report.blueprintAudit.traitAssignmentCount > 0);
  });
});
