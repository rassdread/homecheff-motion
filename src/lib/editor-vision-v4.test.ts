import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultExpressionForPart, setPartExpression } from "@/lib/editor-character-expressions";
import {
  createDefaultHierarchicalSelection,
  enterPartSelectionMode,
  hoverPartsAtPoint,
  pickPartAtPoint,
  updateSelectionAfterPick,
} from "@/lib/editor-hierarchical-selection";
import { applyLogoControl, findLogoParts, logoReadyForAnimation } from "@/lib/editor-logo-controls";
import {
  animationProfileHasMotion,
  motionPreviewKeyframes,
  setPartAnimationInHierarchy,
} from "@/lib/editor-object-animation";
import {
  applyTransformToDocument,
  duplicatePartInHierarchy,
  patchPartMask,
} from "@/lib/editor-object-transforms";
import {
  buildDefaultMascotParts,
  buildObjectHierarchy,
  partSupportsHierarchy,
} from "@/lib/editor-part-hierarchy";
import { humanPartLabel, sanitizeEditorUserLabel } from "@/lib/editor-part-human-labels";
import { buildPartLibraryAsset, savePartToLibrary } from "@/lib/editor-part-library";
import {
  buildStudioMotionHandoff,
  handoffPreservesHierarchy,
  handoffPreservesMasks,
} from "@/lib/editor-studio-motion-handoff";
import type {
  EditorCanvasDocument,
  EditorObject,
  EditorObjectHierarchy,
  EditorObjectPart,
} from "@/types/homecheff-visual-editor";

function mockRootObject(): EditorObject {
  return {
    id: "obj_mascot",
    layerId: "semantic_mascot",
    label: "Mascot",
    confidence: 0.9,
    bbox: { x: 0.2, y: 0.1, width: 0.6, height: 0.8 },
    category: "mascot",
    zIndex: 2,
    visible: true,
    locked: false,
  };
}

function mockHierarchy(): EditorObjectHierarchy {
  const parts = buildDefaultMascotParts(mockRootObject().bbox);
  return {
    rootObjectId: "obj_mascot",
    rootLayerId: "semantic_mascot",
    rootLabel: "Mascot",
    parts,
  };
}

function mockDocument(hierarchy: EditorObjectHierarchy): EditorCanvasDocument {
  const root = mockRootObject();
  return {
    sessionId: "sess_test",
    name: "Test",
    sourceKind: "character",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/bg.png",
    workflowStep: "visual_editor",
    objects: [
      {
        id: "background",
        label: "Background",
        sourceKind: "character",
        assetId: null,
        storageKey: "",
        previewUrl: "",
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        locked: true,
        visible: true,
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        layerType: "background",
      },
      {
        id: "semantic_mascot",
        label: "Mascot",
        sourceKind: "character",
        assetId: null,
        storageKey: "",
        previewUrl: "",
        transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
        locked: false,
        visible: true,
        bounds: root.bbox,
        layerType: "semantic",
        category: "character",
      },
    ],
    placements: [],
    detectedObjects: [{ ...root, parts: hierarchy.parts }],
    objectHierarchies: { [root.id]: hierarchy },
    status: "editing",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("Editor Vision V4", () => {
  it("creates part hierarchy for mascot", () => {
    const hierarchy = mockHierarchy();
    assert.ok(hierarchy.parts.length >= 6);
    assert.ok(hierarchy.parts.some((p) => p.partCategory === "globe"));
    assert.ok(hierarchy.parts.some((p) => p.partCategory === "tie"));
    assert.ok(hierarchy.parts.some((p) => p.partCategory === "logo"));
  });

  it("parent-child masks via patchPartMask", () => {
    const hierarchy = mockHierarchy();
    const arm = hierarchy.parts.find((p) => p.partCategory === "left_arm")!;
    const next = patchPartMask(hierarchy, arm.id, {
      maskUrl: "https://example.com/arm-mask.png",
    });
    const patched = next.parts.find((p) => p.id === arm.id)!;
    assert.equal(patched.mask, "https://example.com/arm-mask.png");
    assert.equal(patched.estimatedBounds, false);
  });

  it("hierarchical selection enters part mode on reselect", () => {
    let state = createDefaultHierarchicalSelection();
    state = updateSelectionAfterPick(state, {
      rootObject: mockRootObject(),
      part: null,
      mode: "object",
    });
    assert.equal(state.rootObjectId, "obj_mascot");
    state = enterPartSelectionMode(state, "obj_mascot");
    assert.equal(state.mode, "part");
  });

  it("picks part at point inside bbox", () => {
    const hierarchy = mockHierarchy();
    const tie = hierarchy.parts.find((p) => p.partCategory === "tie")!;
    const picked = pickPartAtPoint(
      { x: tie.bbox.x + tie.bbox.width / 2, y: tie.bbox.y + tie.bbox.height / 2 },
      hierarchy
    );
    assert.equal(picked?.partCategory, "tie");
  });

  it("hover highlights multiple parts at point", () => {
    const hierarchy = mockHierarchy();
    const face = hierarchy.parts.find((p) => p.partCategory === "face")!;
    const hovered = hoverPartsAtPoint(
      { x: face.bbox.x + 0.01, y: face.bbox.y + 0.01 },
      hierarchy
    );
    assert.ok(hovered.length >= 1);
  });

  it("applies object transforms non-destructively", () => {
    const doc = mockDocument(mockHierarchy());
    const arm = mockHierarchy().parts.find((p) => p.partCategory === "left_arm")!;
    const next = applyTransformToDocument(doc, {
      rootObjectId: "obj_mascot",
      partId: arm.id,
      operation: "rotate",
      transformPatch: { rotation: 15 },
    });
    const updated = next.objectHierarchies!.obj_mascot!.parts.find((p) => p.id === arm.id)!;
    assert.equal(updated.transform.rotation, 15);
    assert.equal(doc.objectHierarchies!.obj_mascot!.parts[0]!.transform.rotation, 0);
  });

  it("duplicates part in hierarchy", () => {
    const hierarchy = mockHierarchy();
    const logo = hierarchy.parts.find((p) => p.partCategory === "logo")!;
    const next = duplicatePartInHierarchy(hierarchy, logo.id);
    assert.equal(next.parts.length, hierarchy.parts.length + 1);
  });

  it("logo controls target logo part", () => {
    const hierarchy = mockHierarchy();
    const logos = findLogoParts(hierarchy);
    assert.equal(logos.length, 1);
    const doc = applyLogoControl(mockDocument(hierarchy), "obj_mascot", "scale", { scale: 1.2 });
    const logo = doc.objectHierarchies!.obj_mascot!.parts.find((p) => p.partCategory === "logo")!;
    assert.equal(logo.transform.scale, 1.2);
  });

  it("logo ready for animation when mask present", () => {
    const part: EditorObjectPart = {
      ...mockHierarchy().parts.find((p) => p.partCategory === "logo")!,
      mask: "https://example.com/m.png",
      estimatedBounds: false,
      animationProfile: "spin",
    };
    assert.equal(logoReadyForAnimation(part), true);
  });

  it("animation metadata and motion preview keyframes", () => {
    const hierarchy = setPartAnimationInHierarchy(mockHierarchy(), mockHierarchy().parts[0]!.id, "wave");
    const globe = hierarchy.parts.find((p) => p.partCategory === "globe")!;
    const withSpin = setPartAnimationInHierarchy(hierarchy, globe.id, "rotate");
    const rotated = motionPreviewKeyframes("rotate", 15);
    assert.ok(animationProfileHasMotion("rotate"));
    assert.ok(Math.abs(rotated.rotation) > 0);
    assert.ok(withSpin.parts.find((p) => p.id === globe.id)?.animationProfile === "rotate");
  });

  it("character expression foundation stores metadata", () => {
    const face = mockHierarchy().parts.find((p) => p.partCategory === "face")!;
    const withExpr = setPartExpression(face, "happy");
    assert.equal(withExpr.expression, "happy");
    assert.equal(defaultExpressionForPart(face), "neutral");
  });

  it("library persistence saves part assets", () => {
    const hierarchy = mockHierarchy();
    const tie = hierarchy.parts.find((p) => p.partCategory === "tie")!;
    const asset = buildPartLibraryAsset({ hierarchy, part: tie });
    assert.ok(asset.label.includes("Tie") || asset.label.includes("Mascot"));
    const doc = savePartToLibrary(mockDocument(hierarchy), "obj_mascot", tie.id);
    assert.equal(doc.partLibraryAssets?.length, 1);
  });

  it("studio motion handoff preserves hierarchy and masks", () => {
    let hierarchy = mockHierarchy();
    const globe = hierarchy.parts.find((p) => p.partCategory === "globe")!;
    hierarchy = patchPartMask(hierarchy, globe.id, { maskUrl: "https://example.com/g.png" });
    const doc = mockDocument(hierarchy);
    const handoff = buildStudioMotionHandoff(doc);
    assert.equal(handoffPreservesHierarchy(handoff), true);
    assert.equal(handoffPreservesMasks(handoff), true);
    assert.ok(handoff.hierarchies[0]!.parts.length > 0);
  });

  it("human-first labels sanitize technical terms", () => {
    assert.equal(humanPartLabel("left_arm"), "Left Arm");
    assert.equal(sanitizeEditorUserLabel("instance mask node"), "Object");
    assert.equal(partSupportsHierarchy(mockRootObject()), true);
  });

  it("buildObjectHierarchy seeds mascot parts", () => {
    const root = mockRootObject();
    const hierarchy = buildObjectHierarchy(root, null, [], "mascot");
    assert.ok(hierarchy.parts.length >= 6);
  });
});
