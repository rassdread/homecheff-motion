import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAssistantEditorContextFromHierarchy } from "@/lib/assistant-editor-context-builder";
import { inferPartGroupFromNode } from "@/lib/assistant-editor-hierarchy-context";
import { buildPartSpecificActionGroups } from "@/lib/assistant-v3-part-actions";
import { buildEditorVisionTruthHierarchy } from "@/lib/editor-vision-truth-mode";
import {
  resolveLegacyActionPartGroupFromNode,
  resolveLegacyActionPartGroupFromPart,
} from "@/lib/editor-vision-hierarchy-action-mapping";
import { portraitWithSunglassesFixture } from "@/lib/editor-vision-evidence-audit";
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

function findFirstPartNode(
  nodes: EditorVisionHierarchyNode[],
  labelMatch: RegExp
): EditorVisionHierarchyNode | null {
  for (const node of nodes) {
    if (node.partId && labelMatch.test(node.label)) {
      return node;
    }
    const child = findFirstPartNode(node.children, labelMatch);
    if (child) {
      return child;
    }
  }
  return null;
}

describe("editor vision hierarchy action mapping", () => {
  it("legacy fixture — eyes and outfit tabs map to old part groups", () => {
    assert.equal(
      inferPartGroupFromNode({
        id: "eyes",
        label: "Ogen",
        category: "objects",
        editable: true,
        taxonomyTab: "eyes",
        children: [],
      }),
      "eyes"
    );
    assert.equal(
      inferPartGroupFromNode({
        id: "outfit",
        label: "Outfit",
        category: "objects",
        editable: true,
        taxonomyTab: "outfit",
        children: [],
      }),
      "outfit"
    );
  });

  it("truth hierarchy leaves carry actionPartGroup for copilot", () => {
    const tree = buildEditorVisionTruthHierarchy({
      analysis: {
        parts: [
          part({ key: "face", label: "Face", category: "face", source: "openai_vision", confidence: 0.88 }),
          part({ key: "eyes", label: "Eyes", category: "eyes" }),
          part({ key: "shirt", label: "Shirt", category: "shirt" }),
          part({ key: "sunglasses", label: "Sunglasses", category: "eyes" }),
        ],
        characterLabel: "Person",
        openAiUsed: true,
        templateUsed: false,
      },
      assetType: "human",
      sectionLabels: { detected: "Detected", estimated: "Estimated", creative: "Creative", debug: "Debug" },
    });

    const eyesNode = findFirstPartNode(tree, /eyes/i);
    const shirtNode = findFirstPartNode(tree, /shirt/i);
    const sunglassesNode = findFirstPartNode(tree, /sunglasses/i);

    assert.ok(eyesNode);
    assert.equal(eyesNode!.actionPartGroup, "eyes");
    assert.equal(inferPartGroupFromNode(eyesNode!), "eyes");

    assert.ok(shirtNode);
    assert.equal(shirtNode!.actionPartGroup, "outfit");
    assert.equal(inferPartGroupFromNode(shirtNode!), "outfit");

    assert.ok(sunglassesNode);
    assert.equal(sunglassesNode!.actionPartGroup, "accessories");
    assert.equal(inferPartGroupFromNode(sunglassesNode!), "accessories");
  });

  it("truth hierarchy selection restores assistant eyes actions", () => {
    const tree = buildEditorVisionTruthHierarchy({
      analysis: portraitWithSunglassesFixture(),
      assetType: "human",
      sectionLabels: { detected: "Detected", estimated: "Estimated", creative: "Creative", debug: "Debug" },
    });
    const eyesNode = findFirstPartNode(tree, /eyes/i);
    assert.ok(eyesNode);

    const ctx = buildAssistantEditorContextFromHierarchy({
      document: {
        name: "Portrait",
        editorFlowMode: "edit",
        visionV6Meta: { taxonomyType: "human" },
        visionHierarchy: tree,
      },
      hierarchy: tree,
      selectedNodeId: eyesNode!.id,
    });

    assert.equal(ctx.selectedPartGroup, "eyes");

    const groups = buildPartSpecificActionGroups(
      {
        partId: eyesNode!.partId ?? eyesNode!.id,
        partName: eyesNode!.label,
        partGroup: ctx.selectedPartGroup ?? "appearance",
        hierarchyPath: ctx.selectedHierarchyPath ?? [],
        assetName: "Portrait",
      },
      {
        assetId: null,
        assetName: "Portrait",
        assetType: "human",
        assetState: "existing",
        taxonomyType: "human",
        selectedParts: ctx.selectedHierarchyPath ?? [],
        partContext: null,
      },
      "nl"
    );

    const labels = groups.flatMap((g) => g.actions.map((a) => a.label));
    assert.ok(labels.some((l) => /groter/i.test(l)));
  });

  it("user taxonomy parent clothing maps to outfit without redesign", () => {
    assert.equal(
      resolveLegacyActionPartGroupFromNode({
        id: "group",
        label: "shirt",
        category: "objects",
        editable: false,
        taxonomyTab: "shirt",
        taxonomyParentTab: "clothing",
        children: [],
      }),
      "outfit"
    );
    assert.equal(
      resolveLegacyActionPartGroupFromPart(
        part({ key: "jacket", label: "Jacket", category: "jacket" }),
        "human"
      ),
      "outfit"
    );
  });

  it("character face tab with eyes label maps to eyes", () => {
    assert.equal(
      resolveLegacyActionPartGroupFromNode({
        id: "truth_vision_eyes",
        label: "Eyes",
        category: "objects",
        editable: true,
        taxonomyTab: "face",
        taxonomyParentTab: "character",
        actionPartGroup: "eyes",
        children: [],
      }),
      "eyes"
    );
  });
});
