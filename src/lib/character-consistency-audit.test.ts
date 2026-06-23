import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCharacterAttributeCoverageReport,
  buildCharacterConsistencyAuditReport,
  buildCharacterTraceReport,
  buildCharacterWorkflowCoverageMatrix,
} from "@/lib/character-consistency-audit";
import { buildReferenceAnalysisProfile } from "@/lib/editor-fusion-reference-profile";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { stampDocumentAnalysisTier } from "@/lib/editor-vision-analysis-tier";
import { ensureFusionPlan } from "@/lib/editor-fusion-plan";

function premiumDoc() {
  let doc = createEditorDocumentFromUpload({
    name: "char-audit.jpg",
    backgroundUrl: "https://example.com/char-audit.jpg",
  });
  doc = stampDocumentAnalysisTier(doc, "premium");
  doc = {
    ...doc,
    visionAnalysis: {
      objectType: "human",
      objectTypeLabel: "Human",
      visualStyle: "Editorial portrait",
      colors: [{ label: "brown", role: "primary" }],
      shapeLanguage: [],
      keyFeatures: ["blue eyes", "dark brown hair", "glasses"],
      brandIdentity: "",
      materialHints: "",
      environmentHints: "",
      suggestedPreserve: [],
      suggestedChange: [],
      suggestedForbidden: [],
      confidence: 0.9,
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
      rtdetrCount: 2,
      visionPartCount: 4,
      mergedLayerCount: 4,
      openAiPartsUsed: true,
      layerSources: [],
      analysisTier: "premium",
    },
  };
  return ensureFusionPlan(doc, "character_fusion");
}

describe("character consistency audit (CC0–CC2)", () => {
  it("builds attribute coverage and trace reports", () => {
    const doc = premiumDoc();
    const coverage = buildCharacterAttributeCoverageReport(doc);
    assert.ok(coverage.sources.some((s) => s.source === "styleDNA" && s.populated));

    const profile = buildReferenceAnalysisProfile({ document: doc, referenceId: "a", premiumCached: true });
    const trace = buildCharacterTraceReport({
      document: doc,
      workflow: "character_fusion",
      profiles: [profile],
      prompt: "blue eyes dark brown hair glasses",
    });
    assert.equal(trace.workflow, "character_fusion");
    assert.ok(trace.steps.length > 0);
  });

  it("builds workflow matrix and full audit report", () => {
    const matrix = buildCharacterWorkflowCoverageMatrix(premiumDoc());
    assert.ok(matrix.workflows.length >= 8);

    const report = buildCharacterConsistencyAuditReport({ document: premiumDoc() });
    assert.ok(report.score.characterConsistencyScore >= 0);
    assert.ok(report.score.characterConsistencyScore <= 100);
    assert.ok(report.drift.items.length >= 0);
  });
});
