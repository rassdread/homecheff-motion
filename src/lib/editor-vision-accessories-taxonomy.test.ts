import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inferPartGroupFromNode } from "@/lib/assistant-editor-hierarchy-context";
import { portraitWithSunglassesFixture } from "@/lib/editor-vision-evidence-audit";
import {
  ACCESSORIES_TAXONOMY_TAB,
  dedupeAccessoryParts,
  groupPartsByTaxonomyTab,
  normalizeAccessoryCanonicalKey,
  resolvePartTaxonomyTab,
} from "@/lib/editor-vision-accessories-taxonomy";
import { enrichAnalysisWithVisionKeyFeatureAccessories } from "@/lib/editor-vision-accessory-detection";
import { visionPartDisplayLabelKey } from "@/lib/editor-vision-part-display-label";
import {
  buildEditorVisionTruthHierarchy,
  splitAnalysisIntoTruthSections,
} from "@/lib/editor-vision-truth-mode";
import { extractTruthSummaryLabels } from "@/lib/editor-vision-summary";
import type { IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type { EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";

function part(
  input: Pick<IllustrationPartSpec, "key" | "label"> &
    Partial<Omit<IllustrationPartSpec, "key" | "label">>
): IllustrationPartSpec {
  return {
    category: "prop",
    group: "character",
    bbox: { x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
    source: "openai_vision",
    confidence: 0.88,
    editable: true,
    ...input,
  };
}

function accessoriesGroupLabels(hierarchy: ReturnType<typeof buildEditorVisionTruthHierarchy>): string[] {
  const detected = hierarchy.find((n) => n.truthSection === "detected");
  const accessoriesParent = detected?.children.find(
    (n) => n.taxonomyTab === "accessories" && !n.taxonomyParentTab
  );
  const labels: string[] = [];
  const walk = (nodes: EditorVisionHierarchyNode[]) => {
    for (const node of nodes) {
      if (node.partId) {
        labels.push(node.label.toLowerCase());
      } else {
        walk(node.children);
      }
    }
  };
  walk(accessoriesParent?.children ?? []);
  return labels;
}

describe("editor vision accessories taxonomy", () => {
  it("1 — portrait with sunglasses → under Accessories group", () => {
    const analysis = portraitWithSunglassesFixture();
    const tree = buildEditorVisionTruthHierarchy({
      analysis,
      assetType: "human",
      sectionLabels: { detected: "Detected", estimated: "Estimated", creative: "Creative", debug: "Debug" },
    });
    const labels = accessoriesGroupLabels(tree);
    assert.ok(labels.some((l) => l.includes("sunglasses")));
  });

  it("2 — portrait with glasses → under Accessories group", () => {
    const analysis = {
      ...portraitWithSunglassesFixture(),
      parts: [
        part({ key: "head", label: "Head", category: "head" }),
        part({ key: "glasses", label: "Reading glasses", category: "eyes", source: "rtdetr" }),
      ],
    };
    const tree = buildEditorVisionTruthHierarchy({
      analysis,
      assetType: "human",
      sectionLabels: { detected: "Detected", estimated: "Estimated", creative: "Creative", debug: "Debug" },
    });
    const labels = accessoriesGroupLabels(tree);
    assert.ok(labels.some((l) => l.includes("reading") || l.includes("glasses")));
  });

  it("3 — dog with collar → under Accessories group", () => {
    const analysis = {
      parts: [
        part({ key: "head", label: "Head", category: "head", group: "character" }),
        part({ key: "collar", label: "Collar", group: "prop", source: "rtdetr", confidence: 0.9 }),
      ],
      characterLabel: "Dog",
      openAiUsed: false,
      templateUsed: false,
    };
    const tree = buildEditorVisionTruthHierarchy({
      analysis,
      assetType: "animal",
      sectionLabels: { detected: "Detected", estimated: "Estimated", creative: "Creative", debug: "Debug" },
    });
    const labels = accessoriesGroupLabels(tree);
    assert.ok(labels.some((l) => l.includes("collar")));
  });

  it("4 — mascot with globe → under Accessories group when detected", () => {
    const analysis = {
      parts: [
        part({ key: "face", label: "Face", category: "face" }),
        part({ key: "globe", label: "Globe", category: "globe", group: "prop", source: "rtdetr", confidence: 0.88 }),
      ],
      characterLabel: "Mascot",
      openAiUsed: true,
      templateUsed: false,
    };
    const tree = buildEditorVisionTruthHierarchy({
      analysis,
      assetType: "mascot",
      sectionLabels: { detected: "Detected", estimated: "Estimated", creative: "Creative", debug: "Debug" },
    });
    const labels = accessoriesGroupLabels(tree);
    assert.ok(labels.some((l) => l.includes("globe")));
  });

  it("6 — alias mapping: glasses / eyewear / aviator → canonical keys", () => {
    assert.equal(normalizeAccessoryCanonicalKey("Eyewear"), "glasses");
    assert.equal(normalizeAccessoryCanonicalKey("Aviator glasses"), "sunglasses");
    assert.equal(normalizeAccessoryCanonicalKey("Pilot glasses"), "sunglasses");
    assert.equal(normalizeAccessoryCanonicalKey("Reading glasses"), "glasses");
    assert.equal(visionPartDisplayLabelKey("Aviator glasses"), "editor.visionPart.sunglasses");
    assert.equal(visionPartDisplayLabelKey("Prescription glasses"), "editor.visionPart.glasses");
  });

  it("7 — no duplicate accessory entries in accessories group", () => {
    const parts = [
      part({ key: "sunglasses_a", label: "Sunglasses", category: "eyes" }),
      part({ key: "sunglasses_b", label: "Aviator glasses", category: "eyes", confidence: 0.7 }),
      part({ key: "glasses", label: "Glasses", category: "eyes", confidence: 0.95 }),
    ];
    const deduped = dedupeAccessoryParts(parts);
    assert.equal(deduped.length, 2);
    const grouped = groupPartsByTaxonomyTab(parts, "human");
    assert.equal((grouped.get(ACCESSORIES_TAXONOMY_TAB) ?? []).length, 2);
  });

  it("summary panel includes accessories from nested taxonomy groups", () => {
    const analysis = portraitWithSunglassesFixture();
    const tree = buildEditorVisionTruthHierarchy({
      analysis,
      assetType: "human",
      sectionLabels: { detected: "Detected", estimated: "Estimated", creative: "Creative", debug: "Debug" },
    });
    const summary = extractTruthSummaryLabels(tree);
    assert.ok(summary.detectedLabels.some((l) => /sunglasses/i.test(l)));
  });

  it("5 — accessory part selection maps to accessories copilot group", () => {
    const node = {
      id: "truth_vision_sunglasses",
      label: "Sunglasses",
      category: "objects" as const,
      editable: true,
      taxonomyTab: ACCESSORIES_TAXONOMY_TAB,
      children: [],
    };
    assert.equal(inferPartGroupFromNode(node), "accessories");
  });

  it("keyFeatures inject places sunglasses in accessories tab", () => {
    const enriched = enrichAnalysisWithVisionKeyFeatureAccessories(
      {
        parts: [part({ key: "eyes", label: "Eyes", category: "eyes" })],
        characterLabel: "Person",
        openAiUsed: true,
        templateUsed: false,
      },
      {
        objectType: "human",
        objectTypeLabel: "Human",
        visualStyle: "Realistic",
        keyFeatures: ["Sunglasses"],
        colors: [],
        shapeLanguage: [],
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
        brandRecognitionConfidence: 0.5,
        identityFingerprint: {
          fingerprintHash: "x",
          identityShapeMarkers: [],
          accessoryPattern: "",
          silhouette: "",
        },
      }
    );
    assert.equal(resolvePartTaxonomyTab(enriched.parts.find((p) => p.key === "sunglasses")!), ACCESSORIES_TAXONOMY_TAB);
    const sections = splitAnalysisIntoTruthSections(enriched, { assetType: "human" });
    assert.ok(sections.detected.some((p) => p.key === "sunglasses"));
  });
});
