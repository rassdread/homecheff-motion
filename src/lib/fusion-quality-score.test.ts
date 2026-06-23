import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFusionDiagnosticExport,
  computeFusionQualityScore,
  computeVisionCoverageFromSources,
} from "@/lib/fusion-quality-score";
import {
  buildFusionBlueprintAudit,
  buildFusionBrandingCoverageReport,
  buildFusionCharacterConsistencyReport,
  buildFusionIntelligenceAuditReport,
  buildFusionPromptCoverageReport,
  buildFusionProviderPayloadCoverageReport,
  buildFusionSourceCoverageReport,
} from "@/lib/fusion-intelligence-audit";
import { buildFusionIntelligencePrompt, buildFusionRenderPayload } from "@/lib/editor-fusion-render-payload";
import { buildReferenceAnalysisProfile } from "@/lib/editor-fusion-reference-profile";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { stampDocumentAnalysisTier } from "@/lib/editor-vision-analysis-tier";
import { createInitialFusionPlan, ensureFusionPlan } from "@/lib/editor-fusion-plan";

function sampleDoc() {
  let doc = createEditorDocumentFromUpload({
    name: "score.jpg",
    backgroundUrl: "https://example.com/score.jpg",
  });
  doc = stampDocumentAnalysisTier(doc, "premium");
  doc = {
    ...doc,
    visionAnalysis: {
      objectType: "human",
      objectTypeLabel: "Human",
      visualStyle: "Clean",
      colors: [],
      shapeLanguage: [],
      keyFeatures: ["blue eyes"],
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
      rtdetrCount: 1,
      visionPartCount: 1,
      mergedLayerCount: 1,
      openAiPartsUsed: true,
      layerSources: [],
      analysisTier: "premium",
    },
  };
  return ensureFusionPlan(doc, "character_fusion");
}

describe("fusion quality score (FQ11/FQ14)", () => {
  it("computes 0–100 score and diagnostic export", () => {
    const doc = sampleDoc();
    const profiles = [
      buildReferenceAnalysisProfile({ document: doc, referenceId: "a", premiumCached: true }),
      buildReferenceAnalysisProfile({ document: doc, referenceId: "b", premiumCached: true }),
    ];
    const plan = createInitialFusionPlan(doc, "character_fusion");
    const payload = buildFusionRenderPayload({ document: doc, plan, profiles });
    const prompt = buildFusionIntelligencePrompt(payload);

    const sourceCoverage = buildFusionSourceCoverageReport(doc);
    const visionScore = computeVisionCoverageFromSources(sourceCoverage);
    assert.ok(visionScore >= 0 && visionScore <= 100);

    const score = computeFusionQualityScore({
      workflow: "character_fusion",
      sourceCoverage,
      promptCoverage: buildFusionPromptCoverageReport({
        document: doc,
        workflow: "character_fusion",
        profiles,
        prompt,
      }),
      blueprintAudit: buildFusionBlueprintAudit({
        workflow: "character_fusion",
        blueprint: payload.blueprint,
        profiles,
      }),
      providerPayload: buildFusionProviderPayloadCoverageReport({ workflow: "character_fusion", payload, prompt }),
      brandingCoverage: buildFusionBrandingCoverageReport({
        workflow: "character_fusion",
        document: doc,
        payload,
        prompt,
      }),
      characterConsistency: buildFusionCharacterConsistencyReport({
        workflow: "character_fusion",
        profiles,
        payload,
        prompt,
      }),
    });

    assert.ok(score.totalFusionQualityScore >= 0);
    assert.ok(score.totalFusionQualityScore <= 100);

    const diagnostic = buildFusionDiagnosticExport(score);
    assert.equal(diagnostic.workflow, "character_fusion");
    assert.ok(typeof diagnostic.totalFusionQualityScore === "number");
  });

  it("full audit report matches diagnostic export fields", () => {
    const report = buildFusionIntelligenceAuditReport({ document: sampleDoc() });
    const diagnostic = buildFusionDiagnosticExport(report.qualityScore);
    assert.equal(diagnostic.promptCoverage, report.qualityScore.breakdown.promptCoverage);
    assert.equal(diagnostic.totalFusionQualityScore, report.qualityScore.totalFusionQualityScore);
  });
});
