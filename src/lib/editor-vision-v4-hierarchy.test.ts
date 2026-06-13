import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEditorVisionHierarchy } from "@/lib/editor-vision-v4-hierarchy";
import type { EditorCanvasLayer, EditorObject, EditorObjectHierarchy } from "@/types/homecheff-visual-editor";

describe("editor vision v4 hierarchy", () => {
  it("builds expandable tree with objects, style, and background", () => {
    const objects: EditorObject[] = [
      {
        id: "obj_1",
        layerId: "layer_char",
        label: "Character",
        category: "person",
        bbox: { x: 0.2, y: 0.1, width: 0.5, height: 0.8 },
        parts: [],
      },
    ];
    const layers: EditorCanvasLayer[] = [
      {
        id: "background",
        label: "Background",
        layerType: "background",
        boundingBox: { x: 0, y: 0, width: 1, height: 1 },
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        sourceKind: "upload",
        assetId: null,
        storageKey: "",
        previewUrl: "",
        visible: true,
        locked: false,
        editable: false,
      },
      {
        id: "layer_char",
        label: "Character",
        layerType: "semantic",
        boundingBox: { x: 0.2, y: 0.1, width: 0.5, height: 0.8 },
        sourceKind: "upload",
        assetId: null,
        storageKey: "",
        previewUrl: "",
        visible: true,
        locked: false,
        editable: true,
      },
    ];
    const hierarchies: Record<string, EditorObjectHierarchy> = {
      obj_1: {
        rootObjectId: "obj_1",
        rootLayerId: "layer_char",
        rootLabel: "Character",
        parts: [
          {
            id: "part_head",
            label: "Head",
            partCategory: "head",
            childPartIds: [],
            bbox: { x: 0.35, y: 0.12, width: 0.2, height: 0.15 },
            confidence: 0.8,
            visible: true,
            locked: false,
            transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
            animationProfile: "nod",
            estimatedBounds: true,
          },
          {
            id: "part_tie",
            label: "Tie",
            partCategory: "tie",
            childPartIds: [],
            bbox: { x: 0.42, y: 0.35, width: 0.08, height: 0.2 },
            confidence: 0.8,
            visible: true,
            locked: false,
            transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
            animationProfile: "none",
            estimatedBounds: true,
          },
        ],
      },
    };

    const tree = buildEditorVisionHierarchy({
      objects,
      layers,
      objectHierarchies: hierarchies,
      vision: {
        objectType: "mascot",
        objectTypeLabel: "Mascot",
        visualStyle: "illustration",
        colors: [{ label: "blue", hex: "#0067B1" }, { label: "white", hex: "#FFFFFF" }],
        shapeLanguage: ["rounded"],
        keyFeatures: ["globe"],
        brandIdentity: "HomeCheff",
        materialHints: "",
        environmentHints: "",
        suggestedPreserve: [],
        suggestedChange: [],
        suggestedForbidden: [],
        confidence: 0.9,
        safetyNotes: [],
        assetFamily: "",
        characterLineage: "",
        brandRecognitionConfidence: 0.8,
        identityFingerprint: {
          fingerprintHash: "test",
          identityShapeMarkers: [],
          accessoryPattern: "",
          silhouette: "",
        },
      },
    });

    assert.ok(tree.some((n) => n.label === "Objects"));
    assert.ok(tree.some((n) => n.label === "Background"));
    const objectsRoot = tree.find((n) => n.id === "objects_root")!;
    assert.equal(objectsRoot.children.length, 1);
    const character = objectsRoot.children[0]!;
    assert.ok(character.children.some((c) => c.label === "Tie"));
    const styleRoot = tree.find((n) => n.id === "style_root");
    assert.ok(styleRoot);
  });
});
