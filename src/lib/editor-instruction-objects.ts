import { resolveHumanFirstObjectType } from "@/lib/editor-ux-cleanup";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { EditorInstructionObjectId } from "@/types/editor-instruction-studio";
import { EDITOR_INSTRUCTION_OBJECT_IDS } from "@/types/editor-instruction-studio";

export type EditorInstructionDetectedObject = {
  id: EditorInstructionObjectId;
  labelKey: string;
  label: string;
  layerId?: string;
  confidence: number;
};

const OBJECT_LABEL_KEYS: Record<EditorInstructionObjectId, string> = {
  character: "editor.instructionStudio.object.character",
  person: "editor.instructionStudio.object.person",
  mascot: "editor.instructionStudio.object.mascot",
  object: "editor.instructionStudio.object.object",
  globe: "editor.instructionStudio.object.globe",
  logo: "editor.instructionStudio.object.logo",
  text: "editor.instructionStudio.object.text",
  background: "editor.instructionStudio.object.background",
  style: "editor.instructionStudio.object.style",
};

function mapLayerToInstructionObject(
  layerLabel: string,
  humanType: string
): EditorInstructionObjectId {
  if (humanType === "globe") {
    return "globe";
  }
  if (humanType === "logo") {
    return "logo";
  }
  if (humanType === "text") {
    return "text";
  }
  if (humanType === "background") {
    return "background";
  }
  if (humanType === "character") {
    if (/mascot|globe.?man|chef/i.test(layerLabel)) {
      return "mascot";
    }
    return "character";
  }
  if (/person|human|man|woman/i.test(layerLabel)) {
    return "person";
  }
  if (/style|illustration|cartoon/i.test(layerLabel)) {
    return "style";
  }
  return "object";
}

export function listInstructionDetectedObjects(
  document: EditorCanvasDocument
): EditorInstructionDetectedObject[] {
  const seen = new Set<EditorInstructionObjectId>();
  const results: EditorInstructionDetectedObject[] = [];

  for (const layer of document.objects) {
    if (layer.layerType === "background") {
      if (!seen.has("background")) {
        seen.add("background");
        results.push({
          id: "background",
          labelKey: OBJECT_LABEL_KEYS.background,
          label: layer.label || "background",
          layerId: layer.id,
          confidence: 1,
        });
      }
      continue;
    }

    const humanType = resolveHumanFirstObjectType(layer);
    const objectId = mapLayerToInstructionObject(layer.label, humanType);
    if (seen.has(objectId)) {
      continue;
    }
    seen.add(objectId);
    results.push({
      id: objectId,
      labelKey: OBJECT_LABEL_KEYS[objectId],
      label: layer.label,
      layerId: layer.id,
      confidence: layer.confidence ?? 0.7,
    });
  }

  if (!seen.has("style")) {
    results.push({
      id: "style",
      labelKey: OBJECT_LABEL_KEYS.style,
      label: "style",
      confidence: 0.6,
    });
  }

  if (results.length === 0) {
    return [
      {
        id: "object",
        labelKey: OBJECT_LABEL_KEYS.object,
        label: "object",
        confidence: 0.5,
      },
    ];
  }

  return results.filter((item) => EDITOR_INSTRUCTION_OBJECT_IDS.includes(item.id));
}
