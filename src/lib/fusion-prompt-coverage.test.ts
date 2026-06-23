import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFusionIntelligencePrompt, buildFusionRenderPayload } from "@/lib/editor-fusion-render-payload";
import { buildFusionPromptCoverageReport } from "@/lib/fusion-intelligence-audit";
import { buildReferenceAnalysisProfile } from "@/lib/editor-fusion-reference-profile";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { stampDocumentAnalysisTier } from "@/lib/editor-vision-analysis-tier";
import { createInitialFusionPlan } from "@/lib/editor-fusion-plan";

describe("fusion prompt coverage (FQ3)", () => {
  it("includes enriched eyes and hair in prompt with measurable coverage", () => {
    let doc = createEditorDocumentFromUpload({
      name: "portrait.jpg",
      backgroundUrl: "https://example.com/portrait.jpg",
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
        keyFeatures: ["blue eyes", "dark hair"],
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
        visionPartCount: 2,
        mergedLayerCount: 2,
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

    assert.ok(prompt.includes("blue eyes") || prompt.includes("Eyes:"));
    assert.ok(!prompt.includes("Preserve appearance only"));

    const coverage = buildFusionPromptCoverageReport({
      document: doc,
      workflow: "character_fusion",
      profiles,
      prompt,
    });
    assert.ok(coverage.promptCoveragePercent >= 50);
  });
});
