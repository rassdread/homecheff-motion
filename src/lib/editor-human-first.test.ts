import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import {
  defaultEditorUiMode,
  markEditorLayerAnimationReady,
  resolveEditorAiSuggestions,
  resolveEditorHumanActions,
  resolveEditorObjectKind,
} from "@/lib/editor-human-first";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

function withSemanticLayer(
  doc: ReturnType<typeof createEditorDocumentFromUpload>,
  label: string,
  category: EditorCanvasLayer["category"] = "product"
) {
  const semantic: EditorCanvasLayer = {
    ...doc.objects[0]!,
    id: `semantic_${label}`,
    label,
    layerType: "semantic",
    locked: false,
    visible: true,
    category,
    semanticType: category ?? "subject",
    bounds: { x: 0.2, y: 0.2, width: 0.35, height: 0.45 },
    transform: { x: 0.4, y: 0.45, scale: 1, rotation: 0 },
  };
  return { ...doc, objects: [doc.objects[0]!, semantic] };
}

describe("editor human first mode", () => {
  it("defaults to visual edit mode", () => {
    assert.equal(defaultEditorUiMode(), "visual");
  });

  it("resolves mascot object kind from label", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Team",
      backgroundUrl: "https://example.com/t.png",
    });
    const mascot: EditorCanvasLayer = {
      ...doc.objects[0]!,
      id: "m1",
      label: "Chef Mascot",
      layerType: "semantic",
      bounds: { x: 0.2, y: 0.2, width: 0.3, height: 0.5 },
      category: "character",
    };
    assert.equal(resolveEditorObjectKind(mascot), "mascot");
  });

  it("returns human actions without technical operations for background", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Scene",
      backgroundUrl: "https://example.com/s.png",
    });
    const bg = doc.objects.find((o) => o.layerType === "background")!;
    const actions = resolveEditorHumanActions(bg);
    assert.ok(actions.some((a) => a.id === "background_replace"));
    assert.ok(actions.every((a) => !a.labelKey.includes("semantic")));
  });

  it("suggests product actions for product layers", () => {
    const doc = withSemanticLayer(
      createEditorDocumentFromUpload({
        name: "Bottle",
        backgroundUrl: "https://example.com/b.png",
      }),
      "Product body",
      "product"
    );
    const layer = doc.objects.find((o) => o.layerType === "semantic")!;
    const suggestions = resolveEditorAiSuggestions(doc, layer);
    assert.ok(suggestions.some((s) => s.id === "remove_bg"));
  });

  it("marks layer animation ready internally", () => {
    const doc = withSemanticLayer(
      createEditorDocumentFromUpload({
        name: "Char",
        backgroundUrl: "https://example.com/c.png",
      }),
      "Sergio",
      "character"
    );
    const layerId = doc.objects.find((o) => o.layerType === "semantic")!.id;
    const next = markEditorLayerAnimationReady(doc, layerId);
    const layer = next.objects.find((o) => o.id === layerId);
    assert.equal(layer?.metadata?.rawFeature, "animation_ready");
  });
});
