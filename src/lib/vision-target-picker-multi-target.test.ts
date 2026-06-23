import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildVisionTargetSelection,
  buildVisionTargetTreeFromDocument,
  findVisionTargetNode,
  flattenSelectableTargets,
} from "@/lib/vision-target-picker-v2";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { IllustrationPartSpec } from "@/types/editor-illustration-parts";

function part(
  input: Pick<IllustrationPartSpec, "key" | "label"> &
    Partial<Omit<IllustrationPartSpec, "key" | "label">>
): IllustrationPartSpec {
  return {
    category: "clothing",
    group: "clothing",
    bbox: { x: 0.3, y: 0.35, width: 0.15, height: 0.2 },
    source: "rtdetr",
    confidence: 0.88,
    editable: true,
    ...input,
  };
}

function multiPartDocument(): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_multi",
    name: "shirt.jpg",
    sourceKind: "character",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/shirt.jpg",
    workflowStep: "visual_editor",
    objects: [],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
    visionV6Meta: {
      mergedAnalysisParts: [
        part({ key: "shirt", label: "Shirt", bbox: { x: 0.25, y: 0.3, width: 0.5, height: 0.45 } }),
        part({ key: "left_sleeve", label: "left_sleeve" }),
        part({ key: "right_sleeve", label: "right_sleeve" }),
        part({ key: "chest_left", label: "chest_left" }),
      ],
      taxonomyType: "human",
      openAiPartsUsed: true,
    },
  };
}

describe("vision target multi-select (Sprint K1.5)", () => {
  it("supports selecting multiple branding targets", () => {
    const doc = multiPartDocument();
    const tree = buildVisionTargetTreeFromDocument(doc);
    const selectable = flattenSelectableTargets(tree.roots);
    assert.ok(selectable.length >= 2);

    const first = selectable[0]!;
    const second = selectable[1]!;
    const selection = buildVisionTargetSelection(doc, [first.id, second.id], tree.roots);
    assert.equal(selection.targetIds.length, 2);
    assert.equal(selection.nodes.length, 2);
    assert.ok(selection.primary);
    assert.equal(findVisionTargetNode(tree.roots, first.id)?.id, first.id);
  });

  it("marks tree as having child parts when hierarchy expands", () => {
    const tree = buildVisionTargetTreeFromDocument(multiPartDocument());
    const labels = flattenSelectableTargets(tree.roots).map((node) => node.normalizedKey);
    assert.ok(labels.some((key) => key.includes("sleeve") || key.includes("shirt")));
  });
});
