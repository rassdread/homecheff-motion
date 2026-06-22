import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeIllustrationPartsWithVisionTaxonomy } from "@/lib/editor-vision-taxonomy";
import {
  buildEditorVisionTruthHierarchy,
  classifyPartTruthTier,
  collectVisionHierarchyNodeIds,
  dedupeHierarchyPartChildren,
  dedupeTruthParts,
  detectedPartLabels,
  filterVisionTruthHierarchyForUser,
  hasValidVisualBbox,
  hierarchyPartDedupeKey,
  isDebugOnlyPart,
  normalizeVisionHierarchyGroups,
  qualifiesForDetectedTier,
  splitAnalysisIntoTruthSections,
  visionTruthGroupId,
} from "@/lib/editor-vision-truth-mode";
import type { IllustrationPartAnalysisResult, IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";

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

function part(
  input: Pick<IllustrationPartSpec, "key" | "label"> &
    Partial<Omit<IllustrationPartSpec, "key" | "label">>
): IllustrationPartSpec {
  return {
    category: "face",
    group: "character",
    bbox: { x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
    source: "rtdetr",
    confidence: 0.88,
    editable: true,
    ...input,
  };
}

function detectedLabels(sections: ReturnType<typeof splitAnalysisIntoTruthSections>): string[] {
  return sections.detected.map((p) => p.label.toLowerCase());
}

describe("editor vision truth mode — strict detected filtering", () => {
  it("dog head — no paws/tail/human clothing in detected", () => {
    const dogVision = vision({
      objectType: "animal",
      objectTypeLabel: "Dog",
      keyFeatures: ["dog", "fur", "collar"],
      visualStyle: "Photograph",
    });

    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "eyes", label: "Eyes", category: "eyes" }),
        part({ key: "ears", label: "Ears", category: "head" }),
        part({ key: "nose", label: "Nose", category: "face" }),
        part({ key: "mouth", label: "Mouth", category: "mouth" }),
        part({ key: "fur", label: "Fur", category: "head", source: "openai_vision", confidence: 0.82 }),
        part({ key: "collar", label: "Collar", category: "prop", group: "prop", source: "rtdetr", confidence: 0.9 }),
        part({ key: "tie", label: "Tie", category: "tie", source: "rtdetr", confidence: 0.88 }),
        part({ key: "pants", label: "Pants", category: "pants", source: "estimated", confidence: 0.62 }),
      ],
      characterLabel: "Dog",
      openAiUsed: true,
      templateUsed: false,
    };

    const { analysis: merged } = mergeIllustrationPartsWithVisionTaxonomy(analysis, {
      vision: dogVision,
      documentName: "dog-head.jpg",
    });

    const sections = splitAnalysisIntoTruthSections(merged, { assetType: "animal" });
    const labels = detectedLabels(sections);

    for (const forbidden of ["paws", "paw", "claws", "tail", "tie", "pants", "shirt", "shoes", "arms", "hands"]) {
      assert.equal(labels.some((l) => l.includes(forbidden)), false, `detected must not include ${forbidden}`);
    }
    assert.ok(labels.some((l) => l.includes("eyes")));
    assert.ok(labels.some((l) => l.includes("collar")));
  });

  it("human portrait — no tie/pants/shoes/style/color/debug in detected", () => {
    const portraitVision = vision({
      objectType: "human",
      objectTypeLabel: "Portrait",
      keyFeatures: ["face", "hair"],
      visualStyle: "Realistic photograph",
    });

    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "face", label: "Face", category: "face", source: "openai_vision", confidence: 0.88 }),
        part({ key: "eyes", label: "Eyes", category: "eyes" }),
        part({ key: "hair", label: "Hair", category: "head", source: "openai_vision", confidence: 0.86 }),
        part({ key: "mouth", label: "Mouth", category: "mouth", parentKey: "face" }),
        part({ key: "shirt", label: "Shirt", category: "shirt", source: "rtdetr", confidence: 0.88 }),
        part({ key: "tie", label: "Tie", category: "tie", source: "estimated", confidence: 0.58 }),
        part({ key: "pants", label: "Pants", category: "pants", source: "estimated", confidence: 0.56 }),
        part({ key: "shoes", label: "Shoes", category: "shoes", source: "estimated", confidence: 0.55 }),
        part({ key: "suitcase", label: "Suitcase", category: "prop", group: "prop", source: "estimated", confidence: 0.5 }),
        part({ key: "umbrella", label: "Umbrella", category: "prop", group: "prop", source: "openai_vision", confidence: 0.52 }),
        part({ key: "style_realistic", label: "Realistic", category: "prop", group: "style", source: "openai_vision" }),
        part({ key: "color_white", label: "White", category: "prop", group: "style", source: "openai_vision" }),
        part({ key: "color_blue", label: "Blue", category: "prop", group: "style", source: "openai_vision" }),
        part({ key: "bg_safe_area", label: "Safe empty area", category: "prop", group: "background", editable: false }),
      ],
      characterLabel: "Person",
      openAiUsed: true,
      templateUsed: false,
    };

    const sections = splitAnalysisIntoTruthSections(analysis, { assetType: "human" });
    const labels = detectedLabels(sections);

    assert.ok(labels.some((l) => l.includes("face")));
    assert.ok(labels.some((l) => l.includes("eyes")));
    assert.ok(labels.some((l) => l.includes("hair")));

    for (const forbidden of ["tie", "pants", "shoes", "suitcase", "umbrella", "realistic", "white", "blue", "safe empty"]) {
      assert.equal(labels.some((l) => l.includes(forbidden)), false, `detected must not include ${forbidden}`);
    }

    assert.ok(sections.debug.some((p) => /white|blue|realistic|safe empty/i.test(p.label)));
    assert.ok(sections.estimated.some((p) => /tie|pants|shoes/i.test(p.label)));
  });

  it("estimated source never enters detected even with bbox and high confidence", () => {
    const p = part({ key: "tie", label: "Tie", source: "estimated", confidence: 0.95, category: "tie" });
    assert.equal(qualifiesForDetectedTier(p, { assetType: "human" }), false);
    assert.equal(classifyPartTruthTier(p, { assetType: "human" }), "estimated");
  });

  it("taxonomy fallback never enters detected", () => {
    const p = part({
      key: "tail",
      label: "Tail",
      source: "taxonomy_fallback",
      confidence: 0.99,
    });
    assert.equal(classifyPartTruthTier(p), "creative");
  });

  it("small or off-crop parts require hard detector + high confidence", () => {
    const tieLow = part({ key: "tie", label: "Tie", category: "tie", source: "rtdetr", confidence: 0.78 });
    const tieHigh = part({ key: "tie", label: "Tie", category: "tie", source: "rtdetr", confidence: 0.9 });
    const tieOpenAi = part({ key: "tie", label: "Tie", category: "tie", source: "openai_vision", confidence: 0.92 });
    assert.equal(classifyPartTruthTier(tieLow, { assetType: "human" }), "estimated");
    assert.equal(classifyPartTruthTier(tieHigh, { assetType: "human" }), "vision");
    assert.equal(classifyPartTruthTier(tieOpenAi, { assetType: "human" }), "estimated");
  });

  it("human with sunglasses — detected includes sunglasses when evidenced", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "face", label: "Face", category: "face", source: "openai_vision", confidence: 0.88 }),
        part({ key: "sunglasses", label: "Sunglasses", category: "eyes", source: "rtdetr", confidence: 0.88 }),
        part({ key: "hair", label: "Hair", category: "head", source: "openai_vision", confidence: 0.86 }),
        part({ key: "shirt", label: "Shirt", category: "shirt", source: "rtdetr", confidence: 0.87 }),
      ],
      characterLabel: "Person",
      openAiUsed: true,
      templateUsed: false,
    };
    const labels = detectedLabels(splitAnalysisIntoTruthSections(analysis, { assetType: "human" }));
    assert.ok(labels.some((l) => l.includes("sunglasses")));
    assert.ok(labels.some((l) => l.includes("shirt")));
    assert.ok(labels.some((l) => l.includes("hair")));
  });

  it("weak sunglasses without head attachment stay estimated", () => {
    const weak = part({
      key: "sunglasses",
      label: "Sunglasses",
      category: "prop",
      group: "prop",
      source: "openai_vision",
      confidence: 0.62,
    });
    assert.equal(classifyPartTruthTier(weak, { assetType: "human", allParts: [weak] }), "estimated");
  });

  it("head-attached sunglasses at 62% enter detected tier", () => {
    const face = part({ key: "face", label: "Face", category: "face", source: "openai_vision", confidence: 0.88 });
    const sunglasses = part({
      key: "sunglasses",
      label: "Sunglasses",
      category: "eyes",
      source: "openai_vision",
      confidence: 0.62,
      bbox: { x: 0.32, y: 0.13, width: 0.36, height: 0.08 },
    });
    assert.equal(
      classifyPartTruthTier(sunglasses, { assetType: "human", allParts: [face, sunglasses] }),
      "vision"
    );
  });

  it("dog with collar — detected includes collar", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "head", label: "Head", category: "head" }),
        part({ key: "collar", label: "Collar", category: "prop", group: "prop", source: "rtdetr", confidence: 0.9 }),
      ],
      characterLabel: "Dog",
      openAiUsed: false,
      templateUsed: false,
    };
    const labels = detectedLabels(splitAnalysisIntoTruthSections(analysis, { assetType: "animal" }));
    assert.ok(labels.some((l) => l.includes("collar")));
  });

  it("mascot holding globe — detected includes globe", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "face", label: "Face", category: "face", source: "openai_vision", confidence: 0.86 }),
        part({
          key: "globe",
          label: "World globe",
          category: "globe",
          group: "prop",
          source: "rtdetr",
          confidence: 0.88,
        }),
      ],
      characterLabel: "Mascot",
      openAiUsed: true,
      templateUsed: false,
    };
    const labels = detectedLabels(splitAnalysisIntoTruthSections(analysis, { assetType: "mascot" }));
    assert.ok(labels.some((l) => l.includes("globe")));
  });

  it("human without visible shoes — shoes not in detected", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "face", label: "Face", source: "openai_vision", confidence: 0.88 }),
        part({ key: "shoes", label: "Shoes", category: "shoes", source: "estimated", confidence: 0.55 }),
        part({ key: "shoes_guess", label: "Shoes", category: "shoes", source: "openai_vision", confidence: 0.68 }),
      ],
      characterLabel: "Person",
      openAiUsed: true,
      templateUsed: false,
    };
    const labels = detectedLabels(splitAnalysisIntoTruthSections(analysis, { assetType: "human" }));
    assert.equal(labels.some((l) => l.includes("shoe")), false);
  });

  it("requires valid bbox for detected — no full-frame or zero bbox", () => {
    assert.equal(hasValidVisualBbox({ x: 0, y: 0, width: 0, height: 0 }), false);
    assert.equal(hasValidVisualBbox({ x: 0, y: 0, width: 1, height: 1 }), false);
    assert.equal(hasValidVisualBbox({ x: 0.2, y: 0.2, width: 0.15, height: 0.1 }), true);

    const noBbox = part({ key: "eyes", label: "Eyes", bbox: { x: 0, y: 0, width: 0, height: 0 } });
    assert.equal(classifyPartTruthTier(noBbox), "estimated");
  });

  it("semantic/style/color labels are debug-only", () => {
    assert.equal(isDebugOnlyPart(part({ key: "color_blue", label: "Blue", group: "style" })), true);
    assert.equal(isDebugOnlyPart(part({ key: "bg_safe", label: "Safe empty area", group: "background" })), true);
    assert.equal(isDebugOnlyPart(part({ key: "style_x", label: "Realistic", group: "style" })), true);
    assert.equal(
      isDebugOnlyPart(part({ key: "sunglasses", label: "Sunglasses", category: "eyes", source: "rtdetr" })),
      false
    );
  });

  it("dedupes duplicate labels keeping strongest evidence", () => {
    const dupes = dedupeTruthParts(
      [
        part({ key: "eyes_a", label: "Eyes", confidence: 0.76 }),
        part({ key: "eyes_b", label: "Eyes", confidence: 0.92 }),
      ],
      "vision"
    );
    assert.equal(dupes.length, 1);
    assert.equal(dupes[0]?.confidence, 0.92);
  });

  it("buildEditorVisionTruthHierarchy hides debug section for normal users", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "eyes", label: "Eyes" }),
        part({ key: "color_white", label: "White", group: "style", source: "openai_vision" }),
      ],
      characterLabel: "Person",
      openAiUsed: false,
      templateUsed: false,
    };

    const tree = buildEditorVisionTruthHierarchy({
      analysis,
      assetType: "human",
      sectionLabels: {
        detected: "Detected",
        estimated: "Estimated",
        creative: "Creative",
        debug: "Debug labels",
      },
    });

    assert.ok(tree.some((n) => n.truthSection === "debug"));
    const userTree = filterVisionTruthHierarchyForUser(tree, false);
    assert.equal(userTree.some((n) => n.truthSection === "debug"), false);
    const adminTree = filterVisionTruthHierarchyForUser(tree, true);
    assert.ok(adminTree.some((n) => n.truthSection === "debug"));
  });

  it("shallow animal detection keeps taxonomy in creative only", () => {
    const shallow: IllustrationPartAnalysisResult = {
      parts: [
        {
          key: "main",
          label: "Main subject",
          category: "prop",
          group: "character",
          bbox: { x: 0, y: 0, width: 1, height: 1 },
          source: "estimated",
          confidence: 0.5,
          editable: true,
        },
      ],
      characterLabel: "Subject",
      openAiUsed: false,
      templateUsed: false,
    };

    const v = vision({
      objectType: "animal",
      objectTypeLabel: "Dog",
      keyFeatures: ["dog", "fur", "collar"],
      visualStyle: "Photograph",
    });

    const { analysis } = mergeIllustrationPartsWithVisionTaxonomy(shallow, {
      vision: v,
      documentName: "my-dog.png",
    });

    const sections = splitAnalysisIntoTruthSections(analysis, { assetType: "animal" });
    assert.equal(sections.detected.length, 0);
    assert.ok(sections.creative.some((p) => /tail|paw|cartoon|mascot/i.test(p.label)));
  });

  it("detectedPartLabels only returns evidence-backed parts", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "face", label: "Face", source: "openai_vision", confidence: 0.88 }),
        part({ key: "tie", label: "Tie", category: "tie", source: "estimated", confidence: 0.6 }),
      ],
      characterLabel: "Person",
      openAiUsed: true,
      templateUsed: false,
    };
    const labels = detectedPartLabels(analysis, { assetType: "human" }).map((l) => l.toLowerCase());
    assert.ok(labels.includes("face"));
    assert.equal(labels.includes("tie"), false);
  });
});

function sectionLabels() {
  return {
    detected: "Detected",
    estimated: "Estimated",
    creative: "Creative",
    debug: "Debug labels",
  };
}

function taxonomyGroupsInSection(
  hierarchy: EditorVisionHierarchyNode[],
  section: "detected" | "estimated" | "creative"
): EditorVisionHierarchyNode[] {
  const sectionNode = hierarchy.find((n) => n.truthSection === section);
  return (sectionNode?.children ?? []).filter((child) => !child.partId);
}

function countParentGroupsByTab(
  hierarchy: EditorVisionHierarchyNode[],
  section: "detected" | "estimated" | "creative",
  tab: string
): number {
  return taxonomyGroupsInSection(hierarchy, section).filter(
    (g) => g.taxonomyTab === tab && !g.taxonomyParentTab
  ).length;
}

function assertUniqueIds(ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    assert.equal(seen.has(id), false, `duplicate hierarchy id: ${id}`);
    seen.add(id);
  }
}

describe("editor vision truth hierarchy — group deduplication", () => {
  it("no duplicate group ids across full truth hierarchy (unknown assetType)", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "face", label: "Face", category: "face", source: "openai_vision", confidence: 0.88 }),
        part({ key: "eyes", label: "Eyes", category: "eyes" }),
        part({ key: "torso", label: "Torso", category: "body", group: "character" }),
        part({ key: "shirt", label: "Shirt", category: "shirt", source: "rtdetr", confidence: 0.87 }),
        part({ key: "sunglasses", label: "Sunglasses", category: "eyes", source: "rtdetr", confidence: 0.88 }),
        part({ key: "smile", label: "Smile", category: "mouth", source: "estimated", confidence: 0.62 }),
        part({ key: "pose_standing", label: "Standing", category: "prop", group: "pose", source: "estimated", confidence: 0.58 }),
        part({ key: "tail_guess", label: "Tail", category: "prop", source: "taxonomy_fallback", confidence: 0.4 }),
      ],
      characterLabel: "Subject",
      openAiUsed: true,
      templateUsed: false,
    };

    const tree = buildEditorVisionTruthHierarchy({
      analysis,
      assetType: "unknown",
      sectionLabels: sectionLabels(),
    });

    assertUniqueIds(collectVisionHierarchyNodeIds(tree));
  });

  it("character parent appears once per truth section", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "face", label: "Face", category: "face", source: "openai_vision", confidence: 0.88 }),
        part({ key: "torso_detected", label: "Torso", category: "body", group: "character" }),
        part({ key: "arms_est", label: "Arms", category: "body", group: "character", source: "estimated", confidence: 0.62 }),
        part({ key: "legs_creative", label: "Legs", category: "body", group: "character", source: "taxonomy_fallback", confidence: 0.35 }),
      ],
      characterLabel: "Person",
      openAiUsed: true,
      templateUsed: false,
    };

    const tree = buildEditorVisionTruthHierarchy({
      analysis,
      assetType: "human",
      sectionLabels: sectionLabels(),
    });

    assert.equal(countParentGroupsByTab(tree, "detected", "character"), 1);
    assert.equal(countParentGroupsByTab(tree, "estimated", "pose"), 1);
    assert.equal(countParentGroupsByTab(tree, "creative", "pose"), 1);
  });

  it("accessories group appears once in detected section", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "face", label: "Face", category: "face", source: "openai_vision", confidence: 0.88 }),
        part({ key: "sunglasses", label: "Sunglasses", category: "eyes", source: "rtdetr", confidence: 0.88 }),
        part({ key: "watch", label: "Watch", category: "prop", group: "prop", source: "rtdetr", confidence: 0.86 }),
      ],
      characterLabel: "Person",
      openAiUsed: true,
      templateUsed: false,
    };

    const tree = buildEditorVisionTruthHierarchy({
      analysis,
      assetType: "unknown",
      sectionLabels: sectionLabels(),
    });

    assert.equal(countParentGroupsByTab(tree, "detected", "accessories"), 1);
    const accessoriesGroup = taxonomyGroupsInSection(tree, "detected").find(
      (g) => g.taxonomyTab === "accessories" && !g.taxonomyParentTab
    );
    assert.ok(accessoriesGroup);
    assert.equal(accessoriesGroup!.id, visionTruthGroupId("detected", "vision", "accessories"));
    assert.ok(accessoriesGroup!.children.length >= 1);
  });

  it("creative parent groups merge children from duplicate taxonomy groups", () => {
    const duplicateGroups: EditorVisionHierarchyNode[] = [
      {
        id: "truth_creative_creative_pose",
        label: "pose",
        category: "objects",
        editable: false,
        truthTier: "creative",
        taxonomyTab: "pose",
        children: [
          {
            id: "truth_creative_creative_pose_standing",
            label: "posture",
            category: "objects",
            editable: false,
            truthTier: "creative",
            taxonomyTab: "posture",
            taxonomyParentTab: "pose",
            children: [
              {
                id: "truth_creative_pose_a",
                label: "Standing",
                category: "objects",
                editable: true,
                partId: "part_pose_a",
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: "truth_creative_creative_pose_dup",
        label: "pose",
        category: "objects",
        editable: false,
        truthTier: "creative",
        taxonomyTab: "pose",
        children: [
          {
            id: "truth_creative_creative_pose_arms",
            label: "arms",
            category: "objects",
            editable: false,
            truthTier: "creative",
            taxonomyTab: "arms",
            taxonomyParentTab: "pose",
            children: [
              {
                id: "truth_creative_pose_b",
                label: "Arms crossed",
                category: "objects",
                editable: true,
                partId: "part_pose_b",
                children: [],
              },
            ],
          },
        ],
      },
    ];

    const normalized = normalizeVisionHierarchyGroups([
      {
        id: "truth_section_creative",
        label: "Creative",
        category: "objects",
        editable: false,
        truthSection: "creative",
        truthTier: "creative",
        children: duplicateGroups,
      },
    ]);

    const creative = normalized[0]!;
    const poseGroups = creative.children.filter((g) => g.taxonomyTab === "pose" && !g.taxonomyParentTab);
    assert.equal(poseGroups.length, 1);
    assert.equal(poseGroups[0]!.children.length, 2);
    assert.equal(poseGroups[0]!.id, visionTruthGroupId("creative", "creative", "pose"));
  });

  it("duplicate labels dedupe safely — keeps distinct bbox instances", () => {
    const leftEye: EditorVisionHierarchyNode = {
      id: "left_eye",
      label: "Eye",
      category: "objects",
      editable: true,
      bbox: { x: 0.2, y: 0.2, width: 0.1, height: 0.08 },
      children: [],
    };
    const rightEye: EditorVisionHierarchyNode = {
      id: "right_eye",
      label: "Eye",
      category: "objects",
      editable: true,
      bbox: { x: 0.55, y: 0.2, width: 0.1, height: 0.08 },
      children: [],
    };
    const duplicateLeft: EditorVisionHierarchyNode = {
      id: "left_eye_dup",
      label: "Eye",
      category: "objects",
      editable: true,
      bbox: { x: 0.2, y: 0.2, width: 0.1, height: 0.08 },
      confidence: 0.95,
      children: [],
    };

    assert.notEqual(hierarchyPartDedupeKey(leftEye), hierarchyPartDedupeKey(rightEye));
    const merged = dedupeHierarchyPartChildren([leftEye, rightEye, duplicateLeft]);
    assert.equal(merged.length, 2);
    assert.equal(merged.some((n) => n.id === "left_eye_dup"), true);
  });

  it("duplicate labels with different partId remain distinct", () => {
    const a: EditorVisionHierarchyNode = {
      id: "a",
      label: "Shoe",
      category: "objects",
      editable: true,
      partId: "part_shoe_left",
      children: [],
    };
    const b: EditorVisionHierarchyNode = {
      id: "b",
      label: "Shoe",
      category: "objects",
      editable: true,
      partId: "part_shoe_right",
      children: [],
    };
    assert.equal(dedupeHierarchyPartChildren([a, b]).length, 2);
  });

  it("React keys are unique recursively after normalization", () => {
    const analysis: IllustrationPartAnalysisResult = {
      parts: [
        part({ key: "face", label: "Face", category: "face", source: "openai_vision", confidence: 0.88 }),
        part({ key: "hair", label: "Hair", category: "head", source: "openai_vision", confidence: 0.86 }),
        part({ key: "shirt", label: "Shirt", category: "shirt", source: "rtdetr", confidence: 0.87 }),
        part({ key: "pants", label: "Pants", category: "pants", source: "estimated", confidence: 0.6 }),
        part({ key: "shoes", label: "Shoes", category: "shoes", source: "estimated", confidence: 0.58 }),
        part({ key: "pose_wave", label: "Waving", category: "prop", group: "pose", source: "estimated", confidence: 0.55 }),
        part({ key: "morph_cartoon", label: "Cartoon style", category: "prop", group: "style", source: "taxonomy_fallback", confidence: 0.4 }),
      ],
      characterLabel: "Person",
      openAiUsed: true,
      templateUsed: false,
    };

    const tree = buildEditorVisionTruthHierarchy({
      analysis,
      assetType: "unknown",
      sectionLabels: sectionLabels(),
    });

    const ids = collectVisionHierarchyNodeIds(tree);
    assert.equal(ids.length, new Set(ids).size);
    assert.ok(tree.some((n) => n.truthSection === "detected"));
    assert.ok(tree.some((n) => n.truthSection === "estimated"));
    assert.ok(tree.some((n) => n.truthSection === "creative"));
  });
});
