import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFusionBlueprint, formatEnrichedFusionBlueprintTraitLines } from "@/lib/editor-fusion-blueprint";
import { buildFusionBlueprintAudit } from "@/lib/fusion-intelligence-audit";
import { buildReferenceAnalysisProfile } from "@/lib/editor-fusion-reference-profile";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { stampDocumentAnalysisTier } from "@/lib/editor-vision-analysis-tier";
import { createInitialFusionPlan } from "@/lib/editor-fusion-plan";

function docWithTraits() {
  let doc = createEditorDocumentFromUpload({
    name: "a.jpg",
    backgroundUrl: "https://example.com/a.jpg",
  });
  doc = stampDocumentAnalysisTier(doc, "premium");
  doc = {
    ...doc,
    visionAnalysis: {
      objectType: "human",
      objectTypeLabel: "Human",
      visualStyle: "Portrait",
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
  return doc;
}

describe("fusion blueprint coverage (FQ4/FQ7)", () => {
  it("enriches trait lines with specific analyzed values", () => {
    const docA = docWithTraits();
    const docB = docWithTraits();
    const profiles = [
      buildReferenceAnalysisProfile({ document: docA, referenceId: "a", roleId: "character_a", premiumCached: true }),
      buildReferenceAnalysisProfile({ document: docB, referenceId: "b", roleId: "character_b", premiumCached: true }),
    ];
    const plan = createInitialFusionPlan(docA, "character_fusion");
    const blueprint = buildFusionBlueprint({ intent: "character_fusion", plan, profiles });
    const enriched = formatEnrichedFusionBlueprintTraitLines(blueprint, profiles);
    assert.ok(enriched.some((line) => line.includes("eyes")));
    assert.ok(enriched.some((line) => line.includes("—") || line.includes("blue")));
  });

  it("audits blueprint filled vs ignored traits", () => {
    const doc = docWithTraits();
    const profiles = [
      buildReferenceAnalysisProfile({ document: doc, referenceId: "a", premiumCached: true }),
      buildReferenceAnalysisProfile({ document: doc, referenceId: "b", premiumCached: true }),
    ];
    const plan = createInitialFusionPlan(doc, "character_fusion");
    const blueprint = buildFusionBlueprint({ intent: "character_fusion", plan, profiles });
    const audit = buildFusionBlueprintAudit({ workflow: "character_fusion", blueprint, profiles });
    assert.ok(audit.filledFields.includes("traitAssignments"));
    assert.ok(audit.traitAssignmentCount > 0);
  });
});
