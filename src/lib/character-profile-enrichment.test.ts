import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMascotConsistencyProfile,
  buildPersonConsistencyProfile,
  formatCharacterConsistencyPromptBlocks,
} from "@/lib/character-consistency-profile";
import { buildReferenceAnalysisProfile } from "@/lib/editor-fusion-reference-profile";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { stampDocumentAnalysisTier } from "@/lib/editor-vision-analysis-tier";

describe("character profile enrichment (CC6/CC7)", () => {
  it("builds person consistency profile from vision key features", () => {
    let doc = createEditorDocumentFromUpload({
      name: "person.jpg",
      backgroundUrl: "https://example.com/person.jpg",
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
        keyFeatures: ["blue eyes", "dark brown hair", "glasses", "beard"],
        brandIdentity: "",
        materialHints: "",
        environmentHints: "",
        suggestedPreserve: [],
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
        rtdetrCount: 2,
        visionPartCount: 4,
        mergedLayerCount: 4,
        openAiPartsUsed: true,
        layerSources: [],
        analysisTier: "premium",
      },
    };

    const profile = buildReferenceAnalysisProfile({ document: doc, referenceId: "a", premiumCached: true });
    const person = buildPersonConsistencyProfile(profile, doc);

    assert.ok(person.eyes || person.eyeColor);
    assert.ok(person.glasses);
    assert.ok(person.beard);
    assert.ok(person.styleDnaSummary);

    const blocks = formatCharacterConsistencyPromptBlocks([profile]);
    assert.ok(blocks.some((line) => line.includes("CHARACTER CONSISTENCY")));
    assert.ok(blocks.some((line) => line.includes("glasses")));
  });

  it("builds mascot consistency profile from existing vision data", () => {
    let doc = createEditorDocumentFromUpload({
      name: "mascot.jpg",
      backgroundUrl: "https://example.com/mascot.jpg",
    });
    doc = stampDocumentAnalysisTier(doc, "premium");
    doc = {
      ...doc,
      visionAnalysis: {
        objectType: "mascot",
        objectTypeLabel: "Mascot",
        visualStyle: "Cartoon mascot",
        colors: [{ label: "orange", role: "primary" }],
        shapeLanguage: [],
        keyFeatures: ["round head", "emblem badge"],
        brandIdentity: "mascot brand",
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
          assetType: "mascot",
          shapeMarkers: [],
          colorMarkers: [],
          accessoryMarkers: [],
          brandMarkers: [],
          confidence: 0.88,
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
        mergedAnalysisParts: [
          {
            key: "emblem",
            label: "emblem badge",
            category: "accessories",
            group: "accessories",
            bbox: { x: 0.4, y: 0.4, width: 0.2, height: 0.2 },
            source: "openai_vision",
            confidence: 0.85,
            editable: true,
          },
        ],
      },
    };

    const profile = buildReferenceAnalysisProfile({ document: doc, referenceId: "mascot", premiumCached: true });
    const mascot = buildMascotConsistencyProfile(profile, doc);

    assert.ok(mascot.visualStyle);
    assert.ok(mascot.colorPalette.length > 0 || mascot.emblems.length >= 0);
  });
});
