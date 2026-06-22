import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearFusionAnalysisCacheForTests,
  hasValidPremiumAnalysis,
  writeCachedFusionAnalysisProfile,
} from "@/lib/editor-fusion-analysis-cache";
import { buildFusionBlueprint } from "@/lib/editor-fusion-blueprint";
import { resetFusionWorkflowCostLogsForTests } from "@/lib/editor-fusion-cost-log";
import {
  fusionIntelligenceRequiredReferenceCount,
  resolveFusionIntelligenceForGeneration,
} from "@/lib/editor-fusion-intelligence";
import { buildReferenceAnalysisProfile } from "@/lib/editor-fusion-reference-profile";
import { buildFusionIntelligencePrompt } from "@/lib/editor-fusion-render-payload";
import {
  fusionWorkflowRenderCredits,
  fusionWorkflowUsesIntelligence,
} from "@/lib/editor-fusion-workflow-credits";
import { ensureFusionPlan } from "@/lib/editor-fusion-plan";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { stampDocumentAnalysisTier } from "@/lib/editor-vision-analysis-tier";
import type { ReferenceAnalysisProfile } from "@/types/editor-fusion-intelligence";

function premiumDocument(name: string) {
  let doc = createEditorDocumentFromUpload({
    name,
    backgroundUrl: `https://example.com/${name}.png`,
  });
  doc = stampDocumentAnalysisTier(doc, "premium");
  doc = {
    ...doc,
    visionAnalysis: {
      objectType: "human",
      objectTypeLabel: "Human",
      visualStyle: "Portrait photo",
      colors: [{ label: "brown", role: "primary" }],
      shapeLanguage: ["oval face"],
      keyFeatures: ["blue eyes", "dark hair"],
      brandIdentity: "",
      materialHints: "",
      environmentHints: "studio",
      suggestedPreserve: ["face"],
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
  return doc;
}

describe("editor-fusion-intelligence", () => {
  it("detects fusion intelligence workflows and render credits", () => {
    assert.equal(fusionWorkflowUsesIntelligence("character_fusion"), true);
    assert.equal(fusionWorkflowRenderCredits("character_fusion"), 25);
    assert.equal(fusionWorkflowRenderCredits("future_child"), 35);
    assert.equal(fusionIntelligenceRequiredReferenceCount("character_fusion"), 2);
  });

  it("reuses premium analysis cache by asset", () => {
    clearFusionAnalysisCacheForTests();
    const doc = premiumDocument("person-a");
    const profile = buildReferenceAnalysisProfile({
      document: doc,
      referenceId: "ref_a",
      premiumCached: true,
    });
    writeCachedFusionAnalysisProfile(doc, profile);
    assert.equal(hasValidPremiumAnalysis(doc), true);
    assert.equal(hasValidPremiumAnalysis(profile.assetId), true);
  });

  it("builds character fusion blueprint with per-reference traits", () => {
    const docA = premiumDocument("a");
    const docB = premiumDocument("b");
    const profiles: ReferenceAnalysisProfile[] = [
      buildReferenceAnalysisProfile({ document: docA, referenceId: "a", roleId: "character_a", premiumCached: true }),
      buildReferenceAnalysisProfile({ document: docB, referenceId: "b", roleId: "character_b", premiumCached: true }),
    ];
    const base = ensureFusionPlan(docA, "character_fusion");
    const plan = base.instructionStudioState!.fusionPlan!;
    const blueprint = buildFusionBlueprint({ intent: "character_fusion", plan, profiles });
    assert.equal(blueprint.workflowType, "character_fusion");
    assert.equal(blueprint.traitAssignments.eyes, "reference_a");
    assert.match(blueprint.renderInstructions.join(" "), /Reference A/i);
    assert.match(blueprint.renderInstructions.join(" "), /Reference B/i);
  });

  it("builds intelligence prompt instead of generic combine text", () => {
    const docA = premiumDocument("a");
    const docB = premiumDocument("b");
    const profiles = [
      buildReferenceAnalysisProfile({ document: docA, referenceId: "a", premiumCached: true }),
      buildReferenceAnalysisProfile({ document: docB, referenceId: "b", premiumCached: true }),
    ];
    const base = ensureFusionPlan(docA, "character_fusion");
    const plan = base.instructionStudioState!.fusionPlan!;
    const blueprint = buildFusionBlueprint({ intent: "character_fusion", plan, profiles });
    const prompt = buildFusionIntelligencePrompt({
      blueprint,
      styleDNA: [],
      referenceAnalysis: profiles,
      renderInstructions: blueprint.renderInstructions,
      references: [],
      logoAssets: [],
      primaryImageUrl: docA.backgroundUrl,
    });
    assert.match(prompt, /HOMECHEFF FUSION BLUEPRINT/);
    assert.match(prompt, /TRAIT ASSIGNMENTS/);
    assert.doesNotMatch(prompt, /Inherit Eyes from references/i);
  });

  it("resolves stored fusion intelligence for generation", () => {
    resetFusionWorkflowCostLogsForTests();
    clearFusionAnalysisCacheForTests();
    const docA = premiumDocument("a");
    const docB = premiumDocument("b");
    const profiles = [
      buildReferenceAnalysisProfile({ document: docA, referenceId: "a", premiumCached: true }),
      buildReferenceAnalysisProfile({ document: docB, referenceId: "b", premiumCached: true }),
    ];
    writeCachedFusionAnalysisProfile(docA, profiles[0]!);
    writeCachedFusionAnalysisProfile(docB, profiles[1]!);
    let doc = ensureFusionPlan(docA, "character_fusion");
    const plan = doc.instructionStudioState!.fusionPlan!;
    doc = {
      ...doc,
      instructionStudioState: {
        ...doc.instructionStudioState,
        fusionIntelligence: {
          workflowType: "character_fusion",
          referenceProfiles: profiles,
          blueprint: buildFusionBlueprint({ intent: "character_fusion", plan, profiles }),
          renderPayload: {
            blueprint: buildFusionBlueprint({ intent: "character_fusion", plan, profiles }),
            styleDNA: [],
            referenceAnalysis: profiles,
            renderInstructions: [],
            references: [],
            logoAssets: [],
            primaryImageUrl: doc.backgroundUrl,
          },
          builtAt: new Date().toISOString(),
          analysisCreditsRequired: 0,
          analysisCreditsCached: 10,
          renderCredits: 25,
        },
      },
    };
    const resolved = resolveFusionIntelligenceForGeneration({ document: doc, plan });
    assert.equal(resolved.ready, true);
    assert.match(resolved.prompt, /HOMECHEFF FUSION BLUEPRINT/);
  });
});
