import { actionsForInstructionCategory, defaultActionForCategory } from "@/lib/editor-instruction-actions";
import { resolveHumanFirstObjectType } from "@/lib/editor-ux-cleanup";
import type { EditorCanvasDocument, EditorCanvasLayer } from "@/types/homecheff-visual-editor";
import type {
  EditorInstructionObjectCategory,
  EditorInstructionObjectV2,
} from "@/types/editor-instruction-studio";

function slugifyId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function inferCategory(layer: EditorCanvasLayer, label: string): EditorInstructionObjectCategory {
  const humanType = resolveHumanFirstObjectType(layer);
  const text = `${label} ${layer.category ?? ""} ${layer.semanticType ?? ""}`.toLowerCase();

  if (layer.layerType === "background" || humanType === "background") {
    return "background";
  }
  if (humanType === "logo" || /logo|brand/.test(text)) {
    return "logo";
  }
  if (humanType === "text" || /text|caption|title|label/.test(text)) {
    return "text";
  }
  if (/mascot|character|chef|person|man|woman|figure/.test(text) || humanType === "character") {
    return "character";
  }
  if (/apron|shirt|jacket|hat|clothing|uniform|outfit/.test(text)) {
    return "clothing";
  }
  if (/packaging|box|carton|wrapper|label/.test(text)) {
    return "packaging";
  }
  if (/cup|mug|bottle|product|item/.test(text)) {
    return "product";
  }
  if (/food|dish|meal|plate|pan|pot/.test(text)) {
    return "food";
  }
  if (/globe|tool|utensil|knife|spoon/.test(text)) {
    return "tool";
  }
  if (/truck|van|vehicle|car/.test(text)) {
    return "vehicle";
  }
  if (/building|storefront|shop|facade/.test(text)) {
    return "building";
  }
  if (/sign|banner|billboard|poster/.test(text)) {
    return "signage";
  }
  if (/sky|scene|environment|landscape|garden|outdoor/.test(text)) {
    return "environment";
  }
  return "other";
}

function describeObject(label: string, category: EditorInstructionObjectCategory): string {
  const normalized = label.trim() || category;
  switch (category) {
    case "clothing":
      return `${normalized} clothing item`;
    case "packaging":
      return `${normalized} packaging`;
    case "character":
      return `${normalized} character or mascot`;
    case "logo":
      return `${normalized} logo or brand mark`;
    case "background":
      return "Scene background";
    default:
      return normalized;
  }
}

function buildObjectFromLayer(layer: EditorCanvasLayer, index: number): EditorInstructionObjectV2 {
  const label = layer.label?.trim() || `Object ${index + 1}`;
  const category = inferCategory(layer, label);
  const id = `obj_${slugifyId(label) || category}_${index}`;
  const suggestedActions = actionsForInstructionCategory(category);
  return {
    id,
    label,
    category,
    confidence: layer.confidence ?? 0.72,
    description: describeObject(label, category),
    suggestedActions,
    layerId: layer.id,
  };
}

export function listInstructionObjectsV2(document: EditorCanvasDocument): EditorInstructionObjectV2[] {
  const results: EditorInstructionObjectV2[] = [];
  const seenLabels = new Set<string>();
  let index = 0;

  for (const layer of document.objects) {
    const obj = buildObjectFromLayer(layer, index);
    const dedupeKey = `${obj.category}:${obj.label.toLowerCase()}`;
    if (seenLabels.has(dedupeKey) && obj.category !== "background") {
      continue;
    }
    seenLabels.add(dedupeKey);
    results.push(obj);
    index += 1;
  }

  if (!results.some((o) => o.category === "background")) {
    results.push({
      id: "obj_background",
      label: "Background",
      category: "background",
      confidence: 1,
      description: "Scene background",
      suggestedActions: actionsForInstructionCategory("background"),
      layerId: "background",
    });
  }

  if (results.length === 0) {
    return [
      {
        id: "obj_main",
        label: "Main subject",
        category: "other",
        confidence: 0.5,
        description: "Main visible subject",
        suggestedActions: actionsForInstructionCategory("other"),
      },
    ];
  }

  return results;
}

export function findInstructionObjectV2(
  document: EditorCanvasDocument,
  objectKey: string
): EditorInstructionObjectV2 | undefined {
  return listInstructionObjectsV2(document).find((o) => o.id === objectKey);
}

export function defaultSelectionForObject(obj: EditorInstructionObjectV2) {
  return {
    objectKey: obj.id,
    objectLabel: obj.label,
    category: obj.category,
    action: obj.suggestedActions[0] ?? defaultActionForCategory(obj.category),
  };
}
