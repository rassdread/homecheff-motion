/**
 * Editor Vision V6 — hierarchical tree for illustrations (character, prop, background, style).
 */

import type { IllustrationPartAnalysisResult } from "@/types/editor-illustration-parts";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type {
  EditorCanvasLayer,
  EditorObject,
  EditorObjectHierarchy,
  EditorVisionHierarchyCategory,
  EditorVisionHierarchyNode,
  EditorVisionPartSource,
} from "@/types/homecheff-visual-editor";

function node(
  input: Omit<EditorVisionHierarchyNode, "children"> & { children?: EditorVisionHierarchyNode[] }
): EditorVisionHierarchyNode {
  return { ...input, children: input.children ?? [] };
}

function sourceLabel(source?: EditorVisionPartSource): EditorVisionPartSource {
  return source ?? "estimated";
}

function buildPartNodes(
  parts: IllustrationPartAnalysisResult["parts"],
  group: IllustrationPartAnalysisResult["parts"][number]["group"],
  keyToLayerId: Map<string, string>,
  objectId?: string
): EditorVisionHierarchyNode[] {
  const groupParts = parts.filter((p) => p.group === group);
  const built = new Map<string, EditorVisionHierarchyNode>();

  for (const part of groupParts) {
    const layerId = keyToLayerId.get(part.key);
    built.set(
      part.key,
      node({
        id: `v6node_${part.key}`,
        label: part.label,
        category: group === "style" ? "style" : group === "background" ? "background" : "objects",
        partId: `part_${part.key}`,
        objectId,
        layerId,
        bbox: part.bbox,
        editable: part.editable,
        estimated: part.source !== "rtdetr",
        source: sourceLabel(part.source),
        confidence: part.confidence,
        children: [],
      })
    );
  }

  const roots: EditorVisionHierarchyNode[] = [];
  for (const part of groupParts) {
    const n = built.get(part.key)!;
    if (part.parentKey && built.has(part.parentKey)) {
      built.get(part.parentKey)!.children.push(n);
    } else {
      roots.push(n);
    }
  }
  return roots;
}

export function buildEditorVisionV6Hierarchy(input: {
  analysis: IllustrationPartAnalysisResult;
  objects: EditorObject[];
  layers: EditorCanvasLayer[];
  semanticLayers?: import("@/types/homecheff-visual-editor").EditorSemanticLayer[];
  objectHierarchies?: Record<string, EditorObjectHierarchy>;
  vision?: AssetVisionAnalysis;
}): EditorVisionHierarchyNode[] {
  const tree: EditorVisionHierarchyNode[] = [];
  const keyToLayerId = new Map<string, string>();
  for (const layer of input.semanticLayers ?? []) {
    const match = layer.id.match(/^v6_([a-z0-9_]+)_\d+$/i);
    if (match) {
      keyToLayerId.set(match[1]!, layer.id);
    }
    if (layer.id === "v6_character_root") {
      keyToLayerId.set("character", layer.id);
    }
    if (layer.id === "v6_prop_root") {
      keyToLayerId.set("globe", layer.id);
    }
  }

  const characterObject = input.objects.find(
    (o) => o.category === "mascot" || o.category === "person"
  );
  const propObject = input.objects.find((o) => o.category === "prop" && o.label.toLowerCase().includes("globe"));
  const characterId = characterObject?.id;
  const propId = propObject?.id;

  const characterParts = buildPartNodes(input.analysis.parts, "character", keyToLayerId, characterId);
  if (characterParts.length > 0) {
    tree.push(
      node({
        id: "v6_character_group",
        label: `Character / ${input.analysis.characterLabel}`,
        category: "objects",
        editable: false,
        source: input.analysis.openAiUsed ? "openai_vision" : "estimated",
        children: characterParts,
      })
    );
  }

  const propParts = buildPartNodes(input.analysis.parts, "prop", keyToLayerId, propId ?? characterId);
  if (propParts.length > 0) {
    tree.push(
      node({
        id: "v6_prop_group",
        label: `Prop${input.analysis.propLabel ? ` — ${input.analysis.propLabel}` : ""}`,
        category: "objects",
        editable: false,
        source: "estimated",
        children: propParts,
      })
    );
  }

  const bgParts = buildPartNodes(input.analysis.parts, "background", keyToLayerId);
  tree.push(
    node({
      id: "v6_background_group",
      label: "Background",
      category: "background",
      editable: false,
      source: "estimated",
      children:
        bgParts.length > 0
          ? bgParts
          : [
              node({ id: "bg_color", label: "Color", category: "background", editable: true, source: "estimated" }),
              node({ id: "bg_shadow", label: "Shadow", category: "background", editable: true, source: "estimated", estimated: true }),
              node({ id: "bg_safe", label: "Safe empty area", category: "background", editable: false, source: "estimated", estimated: true }),
            ],
    })
  );

  const styleParts = buildPartNodes(input.analysis.parts, "style", keyToLayerId);
  const styleChildren: EditorVisionHierarchyNode[] =
    styleParts.length > 0
      ? styleParts
      : [
          ...(input.vision?.visualStyle
            ? [node({ id: "style_visual", label: input.vision.visualStyle, category: "style", editable: false, source: "openai_vision" })]
            : []),
          ...(input.vision?.colors.slice(0, 4).map((c, i) =>
            node({
              id: `style_color_${i}`,
              label: c.label ?? c.hex ?? "Color",
              category: "style",
              editable: false,
              source: "openai_vision",
            })
          ) ?? []),
          ...(input.vision?.shapeLanguage.slice(0, 3).map((s, i) =>
            node({ id: `style_shape_${i}`, label: s, category: "style", editable: false, source: "openai_vision" })
          ) ?? []),
        ];

  if (styleChildren.length > 0) {
    tree.push(
      node({
        id: "v6_style_group",
        label: "Style",
        category: "style",
        editable: false,
        source: "openai_vision",
        children: styleChildren,
      })
    );
  }

  return tree;
}
