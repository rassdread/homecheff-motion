import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCharacterDriftReport } from "@/lib/character-consistency-audit";
import { buildReferenceAnalysisProfile } from "@/lib/editor-fusion-reference-profile";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { stampDocumentAnalysisTier } from "@/lib/editor-vision-analysis-tier";

describe("character drift report (CC11)", () => {
  it("detects attributes available but missing from generic prompt", () => {
    let doc = createEditorDocumentFromUpload({
      name: "drift.jpg",
      backgroundUrl: "https://example.com/drift.jpg",
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

    const profile = buildReferenceAnalysisProfile({ document: doc, referenceId: "a", premiumCached: true });
    const drift = buildCharacterDriftReport({
      workflow: "character_fusion",
      profiles: [profile],
      prompt: "Preserve appearance",
    });

    assert.ok(drift.driftCount > 0);
    assert.ok(drift.items.some((item) => item.drift && item.attribute === "eyes"));
  });

  it("reports no drift when prompt includes analyzed traits", () => {
    let doc = createEditorDocumentFromUpload({
      name: "ok.jpg",
      backgroundUrl: "https://example.com/ok.jpg",
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
    const profile = buildReferenceAnalysisProfile({ document: doc, referenceId: "a", premiumCached: true });
    const drift = buildCharacterDriftReport({
      workflow: "character_fusion",
      profiles: [profile],
      prompt: "Character A: blue eyes brown hair Eyes: blue eyes",
    });
    const eyesDrift = drift.items.find((i) => i.attribute === "eyes");
    assert.equal(eyesDrift?.drift, false);
  });
});
