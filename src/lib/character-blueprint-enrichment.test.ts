import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatEnrichedFusionBlueprintTraitLines } from "@/lib/editor-fusion-blueprint";
import { buildCharacterBlueprintAudit } from "@/lib/character-consistency-audit";
import { buildFusionRenderPayload } from "@/lib/editor-fusion-render-payload";
import { buildReferenceAnalysisProfile } from "@/lib/editor-fusion-reference-profile";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { stampDocumentAnalysisTier } from "@/lib/editor-vision-analysis-tier";
import { createInitialFusionPlan } from "@/lib/editor-fusion-plan";

describe("character blueprint enrichment (CC8)", () => {
  it("uses person consistency values in enriched trait lines", () => {
    let doc = createEditorDocumentFromUpload({
      name: "bp.jpg",
      backgroundUrl: "https://example.com/bp.jpg",
    });
    doc = stampDocumentAnalysisTier(doc, "premium");
    doc = {
      ...doc,
      visionAnalysis: {
        objectType: "human",
        objectTypeLabel: "Human",
        visualStyle: "Portrait",
        colors: [],
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

    const profiles = [
      buildReferenceAnalysisProfile({ document: doc, referenceId: "a", roleId: "character_a", premiumCached: true }),
      buildReferenceAnalysisProfile({ document: doc, referenceId: "b", roleId: "character_b", premiumCached: true }),
    ];
    const plan = createInitialFusionPlan(doc, "character_fusion");
    const payload = buildFusionRenderPayload({ document: doc, plan, profiles });
    const enriched = formatEnrichedFusionBlueprintTraitLines(payload.blueprint, profiles);

    assert.ok(enriched.some((line) => line.includes("—")));
    const audit = buildCharacterBlueprintAudit({ workflow: "character_fusion", profiles, payload });
    assert.ok(audit.enrichedCharacterBlocks > 0);
  });
});
