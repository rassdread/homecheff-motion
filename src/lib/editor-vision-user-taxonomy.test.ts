import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEditorVisionTruthHierarchy,
  collectVisionHierarchyNodeIds,
} from "@/lib/editor-vision-truth-mode";
import {
  groupPartsByUserTaxonomy,
  resolveUserTaxonomyPlacement,
  shouldShowCharacterBodySubGroup,
  USER_TAXONOMY_PARENT_ACCESSORIES,
  USER_TAXONOMY_PARENT_CHARACTER,
  USER_TAXONOMY_PARENT_POSE,
} from "@/lib/editor-vision-user-taxonomy";
import type { IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type { EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";

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

function sectionLabels() {
  return {
    detected: "Detected",
    estimated: "Estimated",
    creative: "Creative",
    debug: "Debug",
  };
}

function findParentGroup(
  hierarchy: EditorVisionHierarchyNode[],
  section: "detected" | "estimated" | "creative",
  parentTab: string
): EditorVisionHierarchyNode | undefined {
  const sectionNode = hierarchy.find((n) => n.truthSection === section);
  return sectionNode?.children.find((n) => n.taxonomyTab === parentTab && !n.taxonomyParentTab);
}

function countBodySubGroups(hierarchy: EditorVisionHierarchyNode[]): number {
  let count = 0;
  const walk = (nodes: EditorVisionHierarchyNode[]) => {
    for (const node of nodes) {
      if (node.taxonomyParentTab === "character" && node.taxonomyTab === "body" && !node.partId) {
        count += 1;
      }
      walk(node.children);
    }
  };
  walk(hierarchy);
  return count;
}

describe("editor vision user taxonomy — body group normalization", () => {
  it("face + torso → Personage with Gezicht, no Lichaam sub-group", () => {
    const analysis = {
      parts: [
        part({ key: "face", label: "Face", category: "face", source: "openai_vision", confidence: 0.88 }),
        part({ key: "torso", label: "Torso", category: "body", group: "character" }),
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

    const character = findParentGroup(tree, "detected", "character");
    assert.ok(character, "Personage/Character parent should exist");
    assert.equal(
      character!.children.some(
        (n) => n.taxonomyTab === "body" && n.taxonomyParentTab === "character" && !n.partId
      ),
      false,
      "No Lichaam sub-group when Gezicht exists"
    );
    assert.ok(character!.children.some((n) => n.taxonomyTab === "face" && n.taxonomyParentTab === "character"));
    assert.ok(character!.children.some((n) => n.partId === "part_torso"), "Torso directly under Personage");
  });

  it("only generic body parts → Personage with Lichaam sub-group", () => {
    const analysis = {
      parts: [
        part({ key: "torso", label: "Torso", category: "body", group: "character", source: "estimated", confidence: 0.62 }),
        part({ key: "neck", label: "Neck", category: "body", group: "character", source: "estimated", confidence: 0.6 }),
      ],
      characterLabel: "Person",
      openAiUsed: false,
      templateUsed: false,
    };

    const tree = buildEditorVisionTruthHierarchy({
      analysis,
      assetType: "human",
      sectionLabels: sectionLabels(),
    });

    const character = findParentGroup(tree, "estimated", "character");
    assert.ok(character);
    assert.ok(
      character!.children.some((n) => n.taxonomyTab === "body" && n.taxonomyParentTab === "character" && !n.partId),
      "Lichaam sub-group when only generic body parts"
    );
  });

  it("arms and legs route to Pose, not Lichaam", () => {
    const arms = part({ key: "arms", label: "Arms", category: "arms", group: "character" });
    const legs = part({ key: "legs", label: "Legs", category: "legs", group: "character" });

    assert.equal(resolveUserTaxonomyPlacement(arms, "human").parent, USER_TAXONOMY_PARENT_POSE);
    assert.equal(resolveUserTaxonomyPlacement(legs, "human").sub, "legs");
  });

  it("shirt and sunglasses route to Kleding and Accessoires", () => {
    const shirt = part({ key: "shirt", label: "Shirt", category: "shirt" });
    const sunglasses = part({ key: "sunglasses", label: "Sunglasses", category: "eyes" });

    assert.equal(resolveUserTaxonomyPlacement(shirt, "human").parent, "clothing");
    assert.equal(resolveUserTaxonomyPlacement(sunglasses, "human").parent, USER_TAXONOMY_PARENT_ACCESSORIES);
    assert.equal(resolveUserTaxonomyPlacement(sunglasses, "human").sub, "glasses");
  });

  it("no repeated Lichaam parent groups across truth sections", () => {
    const analysis = {
      parts: [
        part({ key: "face", label: "Face", category: "face", source: "openai_vision", confidence: 0.88 }),
        part({ key: "torso", label: "Torso", category: "body", group: "character" }),
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

    for (const section of ["detected", "estimated", "creative"] as const) {
      if (section === "detected") {
        assert.equal(
          tree
            .filter((n) => n.truthSection === section)
            .flatMap((n) => n.children.filter((c) => c.taxonomyTab === "character" && !c.taxonomyParentTab))
            .length,
          1,
          "one Personage group in detected"
        );
      }
    }

    assert.equal(
      tree
        .filter((n) => n.truthSection === "estimated")
        .flatMap((n) => n.children.filter((c) => c.taxonomyTab === "pose" && !c.taxonomyParentTab))
        .length,
      1,
      "arms under Pose in estimated"
    );
    assert.equal(
      tree
        .filter((n) => n.truthSection === "creative")
        .flatMap((n) => n.children.filter((c) => c.taxonomyTab === "pose" && !c.taxonomyParentTab))
        .length,
      1,
      "legs under Pose in creative"
    );

    assert.equal(countBodySubGroups(tree), 0, "No Lichaam sub-groups when face-specific parts exist");
    assertUniqueIds(collectVisionHierarchyNodeIds(tree));
  });

  it("shouldShowCharacterBodySubGroup reflects specificity", () => {
    const specific = groupPartsByUserTaxonomy(
      [
        part({ key: "face", label: "Face", category: "face" }),
        part({ key: "torso", label: "Torso", category: "body" }),
      ],
      "human"
    ).get(USER_TAXONOMY_PARENT_CHARACTER)!;

    const genericOnly = groupPartsByUserTaxonomy(
      [part({ key: "torso", label: "Torso", category: "body" })],
      "human"
    ).get(USER_TAXONOMY_PARENT_CHARACTER)!;

    assert.equal(shouldShowCharacterBodySubGroup(specific), false);
    assert.equal(shouldShowCharacterBodySubGroup(genericOnly), true);
  });
});

function assertUniqueIds(ids: string[]): void {
  assert.equal(ids.length, new Set(ids).size);
}
