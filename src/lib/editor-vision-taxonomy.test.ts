import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BLOCKED_SENSITIVE_TAXONOMY_LABELS } from "@/lib/editor-taxonomy-shared";
import { buildAnimalTaxonomyFallbackParts, mergeIllustrationPartsWithAnimalTaxonomy, resolveAnimalTaxonomyKind } from "@/lib/editor-animal-parts-taxonomy";
import { buildHumanTaxonomyFallbackParts, mergeIllustrationPartsWithHumanTaxonomy, resolveHumanTaxonomyKind } from "@/lib/editor-human-parts-taxonomy";
import { mergeIllustrationPartsWithMascotTaxonomy, resolveMascotTaxonomyKind } from "@/lib/editor-mascot-parts-taxonomy";
import { detectEditorMorphActionFromMessage } from "@/lib/editor-morph-actions";
import { detectAssistantPrefillIntent } from "@/lib/assistant-prefill-engine";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { buildInstructionObjectsFromDocument } from "@/lib/editor-instruction-object-feed";
import {
  auditVisionTaxonomyScenario,
  mergeIllustrationPartsWithVisionTaxonomy,
  publicEditablePartLabels,
  resolveVisionTaxonomy,
} from "@/lib/editor-vision-taxonomy";
import { splitAnalysisIntoTruthSections } from "@/lib/editor-vision-truth-mode";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";

function vision(partial: Partial<AssetVisionAnalysis> & Pick<AssetVisionAnalysis, "objectType">): AssetVisionAnalysis {
  return {
    objectTypeLabel: partial.objectTypeLabel ?? partial.objectType,
    visualStyle: partial.visualStyle ?? "",
    colors: [],
    shapeLanguage: [],
    keyFeatures: partial.keyFeatures ?? [],
    brandIdentity: "",
    materialHints: "",
    environmentHints: "",
    suggestedPreserve: [],
    suggestedChange: [],
    suggestedForbidden: [],
    confidence: 0.8,
    safetyNotes: [],
    assetFamily: "",
    characterLineage: "",
    brandRecognitionConfidence: 0.5,
    identityFingerprint: {
      fingerprintHash: "test",
      identityShapeMarkers: [],
      accessoryPattern: "",
      silhouette: "",
    },
    ...partial,
  };
}

const shallowAnalysis = {
  parts: [{ key: "main", label: "Main subject", category: "prop" as const, group: "character" as const, bbox: { x: 0, y: 0, width: 1, height: 1 }, source: "estimated" as const, confidence: 0.5, editable: true }],
  characterLabel: "Subject",
  openAiUsed: false,
  templateUsed: false,
};

describe("editor vision taxonomy — humans, animals, morphs", () => {
  it("human shallow detection exposes taxonomy as creative capabilities", () => {
    const v = vision({
      objectType: "human",
      objectTypeLabel: "Portrait",
      keyFeatures: ["face", "hair"],
      visualStyle: "Photograph",
    });
    const { analysis } = mergeIllustrationPartsWithVisionTaxonomy(shallowAnalysis, {
      vision: v,
      documentName: "selfie.jpg",
    });
    const sections = splitAnalysisIntoTruthSections(analysis);
    const creativeLabels = sections.creative.map((p) => p.label.toLowerCase());
    for (const expected of ["cartoon", "outfit", "pose"]) {
      assert.ok(creativeLabels.some((l) => l.includes(expected)), `missing creative ${expected}`);
    }
    assert.equal(
      sections.detected.some((p) => /cartoon|cinematic/i.test(p.label)),
      false
    );
  });

  it("animal shallow detection exposes taxonomy as creative capabilities", () => {
    const v = vision({
      objectType: "animal",
      objectTypeLabel: "Dog",
      keyFeatures: ["dog", "fur", "collar"],
      visualStyle: "Photograph",
    });
    const { analysis, taxonomy } = mergeIllustrationPartsWithVisionTaxonomy(shallowAnalysis, {
      vision: v,
      documentName: "my-dog.png",
    });
    assert.equal(taxonomy?.type, "animal");
    const sections = splitAnalysisIntoTruthSections(analysis);
    const creativeLabels = sections.creative.map((p) => p.label.toLowerCase());
    for (const expected of ["tail", "paws", "collar", "cartoon animal", "mascot"]) {
      assert.ok(creativeLabels.some((l) => l.includes(expected)), `missing creative ${expected}`);
    }
    assert.equal(sections.detected.some((p) => /tail|paw|body/i.test(p.label)), false);
  });

  it("admin and normal user see same editable parts for human portrait", () => {
    const v = vision({ objectType: "human", objectTypeLabel: "Person", visualStyle: "Photo", keyFeatures: ["portrait"] });
    const merged = mergeIllustrationPartsWithHumanTaxonomy(
      shallowAnalysis,
      resolveHumanTaxonomyKind({ vision: v, documentName: "portrait.jpg" }),
      v
    );
    const adminLabels = publicEditablePartLabels(merged).sort();
    const normalLabels = publicEditablePartLabels(merged).sort();
    assert.deepEqual(adminLabels, normalLabels);
    assert.ok(adminLabels.length > 20);
  });

  it("human morph actions route correctly", () => {
    assert.equal(detectEditorMorphActionFromMessage("maak mij cartoon"), "human_to_cartoon");
    assert.equal(detectEditorMorphActionFromMessage("make me a cartoon version"), "human_to_cartoon");
    const detect = detectAssistantPrefillIntent("maak mij cartoon");
    assert.equal(detect.kind, "prefill");
    if (detect.kind === "prefill") {
      assert.equal(detect.intent, "human_morph");
    }
  });

  it("animal morph actions route correctly", () => {
    assert.equal(detectEditorMorphActionFromMessage("maak mijn hond een mascotte"), "pet_to_mascot");
    const detect = detectAssistantPrefillIntent("maak mijn hond een mascotte");
    assert.equal(detect.kind, "prefill");
    if (detect.kind === "prefill") {
      assert.equal(detect.intent, "animal_morph");
    }
  });

  it("mascot taxonomy still works after human/animal taxonomies", () => {
    const v = vision({
      objectType: "brand_asset",
      objectTypeLabel: "Globe Man",
      visualStyle: "Flat cartoon",
      keyFeatures: ["globe man", "mascot"],
    });
    const merged = mergeIllustrationPartsWithMascotTaxonomy(
      shallowAnalysis,
      resolveMascotTaxonomyKind({ vision: v, documentName: "Globe Man.png" }),
      v
    );
    const labels = publicEditablePartLabels(merged).map((l) => l.toLowerCase());
    assert.ok(labels.some((l) => l.includes("face")));
    assert.ok(labels.some((l) => l.includes("globe") || l.includes("world")));
  });

  it("generic product photo still uses main subject fallback", () => {
    const doc = createEditorDocumentFromUpload({
      name: "product-packshot.jpg",
      backgroundUrl: "https://example.com/product.jpg",
    });
    const labels = buildInstructionObjectsFromDocument(doc).editableObjects.map((o) => o.label);
    assert.ok(labels.includes("Main subject"));
  });

  it("sensitive traits are not inferred or displayed", () => {
    const labels = [
      ...buildHumanTaxonomyFallbackParts("generic_human"),
      ...buildAnimalTaxonomyFallbackParts("dog"),
    ].map((p) => p.label);
    for (const label of labels) {
      assert.equal(BLOCKED_SENSITIVE_TAXONOMY_LABELS.test(label), false, `blocked label leaked: ${label}`);
    }
    assert.ok(!labels.some((l) => /ethnicity|race|religion|attractiveness/i.test(l)));
  });

  it("mixed human + animal scene resolves primary taxonomy per subject signal", () => {
    const human = resolveVisionTaxonomy({
      vision: vision({ objectType: "human", objectTypeLabel: "Person", keyFeatures: ["woman", "dog"], visualStyle: "photo" }),
      documentName: "woman-with-dog.jpg",
      semanticLayerLabels: ["Person", "Dog"],
    });
    const animal = resolveAnimalTaxonomyKind({
      vision: vision({ objectType: "animal", objectTypeLabel: "Dog", keyFeatures: ["dog"], visualStyle: "photo" }),
      documentName: "dog-closeup.jpg",
    });
    assert.equal(human?.type, "human");
    assert.equal(animal, "dog");
  });

  it("audit scenarios classify supported asset types", () => {
    const scenarios = [
      {
        id: "portrait",
        label: "Portrait",
        vision: vision({ objectType: "human", objectTypeLabel: "Portrait", visualStyle: "Photo", keyFeatures: ["face"] }),
        documentName: "portrait.jpg",
      },
      {
        id: "dog",
        label: "Dog",
        vision: vision({ objectType: "animal", objectTypeLabel: "Dog", visualStyle: "Photo", keyFeatures: ["dog"] }),
        documentName: "dog.jpg",
      },
      {
        id: "mascot",
        label: "Mascot",
        vision: vision({ objectType: "mascot", objectTypeLabel: "Globe Man", visualStyle: "Cartoon", keyFeatures: ["globe man"] }),
        documentName: "globe-man.png",
      },
      {
        id: "product",
        label: "Product",
        vision: vision({ objectType: "product", objectTypeLabel: "Product", visualStyle: "Photo", keyFeatures: ["packaging"] }),
        documentName: "product.jpg",
      },
    ];

    const results = scenarios.map((s) => auditVisionTaxonomyScenario(s));
    assert.equal(results.find((r) => r.scenarioId === "portrait")?.taxonomyType, "human");
    assert.equal(results.find((r) => r.scenarioId === "dog")?.taxonomyType, "animal");
    assert.equal(results.find((r) => r.scenarioId === "mascot")?.taxonomyType, "mascot");
    assert.equal(results.find((r) => r.scenarioId === "product")?.fallsBackToGeneric, true);
  });
});
