import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCharacterConsistencyDiagnosticExport,
  computeCharacterConsistencyScore,
} from "@/lib/character-consistency-score";
import {
  buildCharacterBlueprintAudit,
  buildCharacterDriftReport,
  buildCharacterPayloadCoverageReport,
  buildCharacterPromptCoverageReport,
} from "@/lib/character-consistency-audit";
import { buildFusionRenderPayload, buildFusionIntelligencePrompt } from "@/lib/editor-fusion-render-payload";
import { buildReferenceAnalysisProfile } from "@/lib/editor-fusion-reference-profile";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { stampDocumentAnalysisTier } from "@/lib/editor-vision-analysis-tier";
import { createInitialFusionPlan } from "@/lib/editor-fusion-plan";

function doc() {
  let d = createEditorDocumentFromUpload({
    name: "score.jpg",
    backgroundUrl: "https://example.com/score.jpg",
  });
  d = stampDocumentAnalysisTier(d, "premium");
  d = {
    ...d,
    visionAnalysis: {
      objectType: "human",
      objectTypeLabel: "Human",
      visualStyle: "Clean",
      colors: [{ label: "blue", role: "primary" }],
      shapeLanguage: [],
      keyFeatures: ["blue eyes", "brown hair"],
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
  return d;
}

describe("character consistency score (CC10/CC14)", () => {
  it("computes score and diagnostic export", () => {
    const document = doc();
    const profiles = [
      buildReferenceAnalysisProfile({ document, referenceId: "a", premiumCached: true }),
      buildReferenceAnalysisProfile({ document, referenceId: "b", premiumCached: true }),
    ];
    const plan = createInitialFusionPlan(document, "character_fusion");
    const payload = buildFusionRenderPayload({ document, plan, profiles });
    const prompt = buildFusionIntelligencePrompt(payload);

    const score = computeCharacterConsistencyScore({
      workflow: "character_fusion",
      profiles,
      promptCoverage: buildCharacterPromptCoverageReport({ workflow: "character_fusion", profiles, prompt }),
      blueprintAudit: buildCharacterBlueprintAudit({ workflow: "character_fusion", profiles, payload }),
      payloadCoverage: buildCharacterPayloadCoverageReport({ workflow: "character_fusion", profiles, payload }),
      drift: buildCharacterDriftReport({ workflow: "character_fusion", profiles, prompt }),
    });

    assert.ok(score.characterConsistencyScore >= 0);
    assert.ok(score.characterConsistencyScore <= 100);

    const diagnostic = buildCharacterConsistencyDiagnosticExport(score);
    assert.equal(diagnostic.workflow, "character_fusion");
    assert.ok(typeof diagnostic.mascotCoverage === "number");
  });
});
