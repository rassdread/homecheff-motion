import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFusionCharacterConsistencyReport } from "@/lib/fusion-intelligence-audit";
import { buildFusionRenderPayload, buildFusionIntelligencePrompt } from "@/lib/editor-fusion-render-payload";
import { buildReferenceAnalysisProfile } from "@/lib/editor-fusion-reference-profile";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { stampDocumentAnalysisTier } from "@/lib/editor-vision-analysis-tier";
import { createInitialFusionPlan } from "@/lib/editor-fusion-plan";

describe("fusion character consistency (FQ10)", () => {
  it("tracks face hair eyes from profile through prompt", () => {
    let doc = createEditorDocumentFromUpload({
      name: "char.jpg",
      backgroundUrl: "https://example.com/char.jpg",
    });
    doc = stampDocumentAnalysisTier(doc, "premium");
    doc = {
      ...doc,
      visionAnalysis: {
        objectType: "human",
        objectTypeLabel: "Human",
        visualStyle: "Editorial",
        colors: [{ label: "brown", role: "primary" }],
        shapeLanguage: [],
        keyFeatures: ["green eyes", "curly hair", "beard"],
        brandIdentity: "",
        materialHints: "",
        environmentHints: "",
        suggestedPreserve: [],
        suggestedChange: [],
        suggestedForbidden: [],
        confidence: 0.88,
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
          confidence: 0.88,
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

    const profiles = [
      buildReferenceAnalysisProfile({ document: doc, referenceId: "a", premiumCached: true }),
      buildReferenceAnalysisProfile({ document: doc, referenceId: "b", premiumCached: true }),
    ];
    const plan = createInitialFusionPlan(doc, "character_fusion");
    const payload = buildFusionRenderPayload({ document: doc, plan, profiles });
    const prompt = buildFusionIntelligencePrompt(payload);

    const report = buildFusionCharacterConsistencyReport({
      workflow: "character_fusion",
      profiles,
      payload,
      prompt,
    });

    const eyes = report.rows.find((row) => row.dimension === "eyes");
    const hair = report.rows.find((row) => row.dimension === "hair");
    assert.ok(eyes?.available);
    assert.ok(hair?.available);
    assert.ok(eyes?.inPrompt);
    assert.ok(report.coveragePercent >= 40);
  });
});
