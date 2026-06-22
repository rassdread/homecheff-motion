import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildVisibleEditorPartsTree,
  extractPartsFromObjectHierarchies,
  translateVisiblePartLabel,
} from "@/lib/build-visible-editor-parts-tree";
import { portraitWithSunglassesFixture } from "@/lib/editor-vision-evidence-audit";
import { resolveLegacyActionPartGroupFromNode } from "@/lib/editor-vision-hierarchy-action-mapping";
import { countVisionHierarchyNodes } from "@/lib/editor-vision-v6-stability";
import type { IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type {
  EditorCanvasDocument,
  EditorObject,
  EditorSemanticLayer,
  EditorVisionHierarchyNode,
} from "@/types/homecheff-visual-editor";

function part(
  input: Pick<IllustrationPartSpec, "key" | "label"> &
    Partial<Omit<IllustrationPartSpec, "key" | "label">>
): IllustrationPartSpec {
  return {
    category: "face",
    group: "character",
    bbox: { x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
    source: "openai_vision",
    confidence: 0.9,
    editable: true,
    ...input,
  };
}

function collectLeafLabels(nodes: EditorVisionHierarchyNode[]): string[] {
  const labels: string[] = [];
  const walk = (list: EditorVisionHierarchyNode[]) => {
    for (const node of list) {
      if (node.children.length === 0 && node.partId) {
        labels.push(node.label);
      }
      walk(node.children);
    }
  };
  walk(nodes);
  return labels;
}

function findLeaf(
  nodes: EditorVisionHierarchyNode[],
  labelMatch: RegExp
): EditorVisionHierarchyNode | null {
  for (const node of nodes) {
    if (node.partId && labelMatch.test(node.label)) {
      return node;
    }
    const child = findLeaf(node.children, labelMatch);
    if (child) {
      return child;
    }
  }
  return null;
}

function leavesInSection(
  nodes: EditorVisionHierarchyNode[],
  section: "detected" | "estimated" | "creative"
): EditorVisionHierarchyNode[] {
  const sectionNode = nodes.find((n) => n.truthSection === section);
  if (!sectionNode) {
    return [];
  }
  const leaves: EditorVisionHierarchyNode[] = [];
  const walk = (list: EditorVisionHierarchyNode[]) => {
    for (const node of list) {
      if (node.partId) {
        leaves.push(node);
      }
      walk(node.children);
    }
  };
  walk(sectionNode.children);
  return leaves;
}

describe("buildVisibleEditorPartsTree", () => {
  it("shows Ogen, Mond, Haar, Shirt, Zonnebril from Vision Parts", () => {
    const analysis = portraitWithSunglassesFixture();
    const result = buildVisibleEditorPartsTree({
      mergedAnalysisParts: analysis.parts,
      assetType: "human",
    });

    const labels = collectLeafLabels(result.tree);
    for (const token of ["Ogen", "Mond", "Haar", "Shirt", "Zonnebril"]) {
      assert.ok(labels.includes(token), `missing ${token}`);
    }
    assert.equal(result.debug.datasourceUsed, "merged_analysis");
    assert.ok(result.debug.visibleTreeNodeCount > 8);
  });

  it("injects Zonnebril from keyFeatures when parts API missed sunglasses", () => {
    const result = buildVisibleEditorPartsTree({
      mergedAnalysisParts: [
        part({ key: "head", label: "Head", category: "head" }),
        part({ key: "eyes", label: "Eyes", category: "eyes" }),
        part({ key: "mouth", label: "Mouth", category: "mouth" }),
      ],
      keyFeatures: ["Curly hair", "Sunglasses", "Casual t-shirt"],
      assetType: "human",
    });

    const labels = collectLeafLabels(result.tree);
    assert.ok(labels.includes("Zonnebril"), `expected Zonnebril, got ${labels.join(", ")}`);
  });

  it("head does not swallow eyes, mouth, and hair", () => {
    const result = buildVisibleEditorPartsTree({
      mergedAnalysisParts: [
        part({ key: "head", label: "Head", category: "head" }),
        part({ key: "eyes", label: "Eyes", category: "eyes" }),
        part({ key: "mouth", label: "Mouth", category: "mouth" }),
        part({ key: "hair", label: "Hair", category: "hair" }),
      ],
      assetType: "human",
    });

    const labels = collectLeafLabels(result.tree);
    assert.ok(labels.includes("Hoofd") || labels.includes("Gezicht"));
    assert.ok(labels.includes("Ogen"));
    assert.ok(labels.includes("Mond"));
    assert.ok(labels.includes("Haar"));
  });

  it("hides mixed and keeps evidence-backed face parts", () => {
    const result = buildVisibleEditorPartsTree({
      mergedAnalysisParts: [
        part({ key: "eyes", label: "Eyes", category: "eyes" }),
        part({ key: "mixed", label: "mixed", category: "face", source: "estimated", confidence: 0.3 }),
        part({ key: "main", label: "Main subject", category: "face", source: "estimated", confidence: 0.3 }),
      ],
      assetType: "human",
    });

    const labels = collectLeafLabels(result.tree).map((l) => l.toLowerCase());
    assert.ok(labels.includes("ogen"));
    assert.ok(!labels.includes("mixed"));
    assert.ok(!labels.some((l) => l.includes("main subject")));
  });

  it("does not show pants/shoes/hands as detected without evidence", () => {
    const result = buildVisibleEditorPartsTree({
      mergedAnalysisParts: [
        part({ key: "eyes", label: "Eyes", category: "eyes" }),
        part({
          key: "pants",
          label: "Pants",
          category: "pants",
          source: "estimated",
          confidence: 0.4,
          bbox: { x: 0, y: 0, width: 0, height: 0 },
        }),
        part({
          key: "hands",
          label: "Hands",
          category: "hand",
          source: "estimated",
          confidence: 0.35,
          bbox: { x: 0, y: 0, width: 0, height: 0 },
        }),
      ],
      assetType: "human",
    });

    const detected = leavesInSection(result.tree, "detected").map((n) => n.label.toLowerCase());
    assert.ok(detected.includes("ogen"));
    assert.ok(!detected.includes("broek"));
    assert.ok(!detected.includes("handen"));
  });

  it("uses semanticLayers only when Vision Parts are empty", () => {
    const semanticLayers: EditorSemanticLayer[] = [
      {
        id: "v6_eyes_1",
        label: "Eyes",
        type: "semantic",
        bounds: { x: 0.2, y: 0.2, width: 0.1, height: 0.1 },
        parentId: null,
        metadata: {},
      },
    ];

    const withParts = buildVisibleEditorPartsTree({
      mergedAnalysisParts: [part({ key: "mouth", label: "Mouth", category: "mouth" })],
      semanticLayers,
      assetType: "human",
    });
    assert.equal(withParts.debug.datasourceUsed, "merged_analysis");
    assert.ok(!collectLeafLabels(withParts.tree).includes("Ogen"));

    const withoutParts = buildVisibleEditorPartsTree({
      semanticLayers,
      assetType: "human",
    });
    assert.equal(withoutParts.debug.datasourceUsed, "semantic_layers");
    assert.ok(collectLeafLabels(withoutParts.tree).includes("Ogen"));
  });

  it("maps actionPartGroup for Ogen, Shirt, and Zonnebril clicks", () => {
    const analysis = portraitWithSunglassesFixture();
    const result = buildVisibleEditorPartsTree({
      mergedAnalysisParts: analysis.parts,
      assetType: "human",
    });

    const eyes = findLeaf(result.tree, /Ogen/);
    const shirt = findLeaf(result.tree, /Shirt/);
    const sunglasses = findLeaf(result.tree, /Zonnebril/);

    assert.ok(eyes);
    assert.ok(shirt);
    assert.ok(sunglasses);
    assert.equal(resolveLegacyActionPartGroupFromNode(eyes!), "eyes");
    assert.equal(resolveLegacyActionPartGroupFromNode(shirt!), "outfit");
    assert.equal(resolveLegacyActionPartGroupFromNode(sunglasses!), "accessories");
  });

  it("translates common labels to Dutch", () => {
    assert.equal(translateVisiblePartLabel(part({ key: "eyes", label: "Eyes" })), "Ogen");
    assert.equal(translateVisiblePartLabel(part({ key: "mouth", label: "Mouth" })), "Mond");
    assert.equal(translateVisiblePartLabel(part({ key: "sunglasses", label: "Sunglasses" })), "Zonnebril");
    assert.equal(translateVisiblePartLabel(part({ key: "jacket", label: "Jacket" })), "Jas");
  });

  it("extracts parts from objectHierarchies when mergedAnalysisParts missing", () => {
    const now = new Date().toISOString();
    const doc: EditorCanvasDocument = {
      sessionId: "sess",
      name: "p.png",
      sourceKind: "character",
      sourceAssetId: null,
      backgroundUrl: "https://example.com/p.png",
      workflowStep: "visual_editor",
      objects: [],
      placements: [],
      status: "editing",
      createdAt: now,
      updatedAt: now,
      objectHierarchies: {
        obj_1: {
          rootObjectId: "obj_1",
          rootLayerId: "layer_1",
          rootLabel: "Person",
          parts: [
            {
              id: "part_eyes",
              label: "Eyes",
              partCategory: "eyes",
              childPartIds: [],
              bbox: { x: 0.2, y: 0.2, width: 0.1, height: 0.05 },
              confidence: 0.9,
              visible: true,
              locked: false,
              transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
              animationProfile: "none",
            },
          ],
        },
      },
    };

    const extracted = extractPartsFromObjectHierarchies(doc);
    assert.equal(extracted.length, 1);
    assert.equal(extracted[0]?.key, "eyes");
  });

  it("does not produce head-only tree when multiple Vision Parts exist", () => {
    const result = buildVisibleEditorPartsTree({
      mergedAnalysisParts: [
        part({ key: "head", label: "Head", category: "head" }),
        part({ key: "eyes", label: "Eyes", category: "eyes" }),
        part({ key: "mouth", label: "Mouth", category: "mouth" }),
        part({ key: "shirt", label: "Shirt", category: "shirt" }),
      ],
      assetType: "human",
    });

    const leaves = collectLeafLabels(result.tree);
    assert.ok(leaves.length >= 4);
    assert.ok(countVisionHierarchyNodes(result.tree) > 4);
  });

  it("portrait with face bbox adds missing eyes/mouth/hair under Mogelijk aanwezig", () => {
    const result = buildVisibleEditorPartsTree({
      mergedAnalysisParts: [
        part({ key: "head", label: "Head", category: "head" }),
        part({ key: "sunglasses", label: "Sunglasses", category: "eyes", confidence: 0.94 }),
      ],
      assetType: "human",
    });

    const estimated = leavesInSection(result.tree, "estimated").map((n) => n.label);
    const all = collectLeafLabels(result.tree);
    assert.ok(all.includes("Hoofd") || all.includes("Gezicht"));
    assert.ok(all.includes("Zonnebril"));
    assert.ok(
      estimated.includes("Ogen") || all.includes("Ogen"),
      `expected Ogen, estimated=${estimated.join(", ")}, all=${all.join(", ")}`
    );
    assert.ok(estimated.includes("Mond"));
    assert.ok(estimated.includes("Haar") || estimated.includes("Baard"));
    assert.ok(all.includes("Shirt") || estimated.includes("Shirt"));
    assert.ok(all.includes("Achtergrond") || estimated.includes("Achtergrond"));
  });

  it("supplements thin merged parts from semantic layers", () => {
    const semanticLayers: EditorSemanticLayer[] = [
      {
        id: "v6_eyes_1",
        label: "Eyes",
        type: "semantic",
        bounds: { x: 0.2, y: 0.2, width: 0.1, height: 0.1 },
        parentId: null,
        metadata: {},
      },
      {
        id: "v6_mouth_1",
        label: "Mouth",
        type: "semantic",
        bounds: { x: 0.2, y: 0.35, width: 0.1, height: 0.08 },
        parentId: null,
        metadata: {},
      },
      {
        id: "v6_shirt_1",
        label: "Shirt",
        type: "semantic",
        bounds: { x: 0.15, y: 0.5, width: 0.7, height: 0.35 },
        parentId: null,
        metadata: {},
      },
    ];
    const result = buildVisibleEditorPartsTree({
      mergedAnalysisParts: [
        part({ key: "head", label: "Head", category: "head" }),
        part({ key: "sunglasses", label: "Sunglasses", category: "eyes", confidence: 0.94 }),
      ],
      semanticLayers,
      assetType: "human",
    });
    const labels = collectLeafLabels(result.tree);
    assert.ok(labels.includes("Ogen"), labels.join(", "));
    assert.ok(labels.includes("Mond"), labels.join(", "));
    assert.ok(labels.includes("Shirt"), labels.join(", "));
  });

  it("records dropReason for every dropped raw part label", () => {
    const result = buildVisibleEditorPartsTree({
      mergedAnalysisParts: [
        part({ key: "eyes", label: "Eyes", category: "eyes" }),
        part({ key: "mixed", label: "mixed", category: "face", source: "estimated", confidence: 0.3 }),
        part({ key: "eyes", label: "Eyes duplicate", category: "eyes" }),
      ],
      assetType: "human",
    });

    assert.ok(result.debug.dropReasons.some((row) => row.reason === "noise_label"));
    assert.ok(result.debug.dropReasons.some((row) => row.reason === "duplicate_key"));
    for (const row of result.debug.dropReasons) {
      assert.ok(row.label.length > 0);
      assert.ok(row.reason.length > 0);
    }
  });

  it("exposes expanded visible tree debug fields", () => {
    const analysis = portraitWithSunglassesFixture();
    const result = buildVisibleEditorPartsTree({
      mergedAnalysisParts: analysis.parts,
      assetType: "human",
    });

    assert.ok(result.debug.rawPartLabels.length > 0);
    assert.ok(result.debug.mergedAnalysisPartLabels.length > 0);
    assert.ok(result.debug.visibleLeafLabels.length > 0);
    assert.ok(Array.isArray(result.debug.dropReasons));
    for (const label of ["Ogen", "Mond", "Zonnebril"]) {
      assert.ok(
        result.debug.visibleLeafLabels.includes(label),
        `visibleLeafLabels missing ${label}`
      );
    }
  });
});
