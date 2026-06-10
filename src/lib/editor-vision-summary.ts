import type { TranslationKey } from "@/i18n";
import { isApproximateEditorSelection } from "@/lib/editor-object-mask";
import { resolveHumanFirstObjectType } from "@/lib/editor-ux-cleanup";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

const TYPE_ITEM_KEYS: Record<string, TranslationKey> = {
  character: "editor.visionSummary.item.character",
  globe: "editor.visionSummary.item.globe",
  logo: "editor.visionSummary.item.logo",
  text: "editor.visionSummary.item.text",
  background: "editor.visionSummary.item.background",
  object: "editor.visionSummary.item.object",
};

const SUGGESTED_ACTION_KEYS: TranslationKey[] = [
  "editor.visionSummary.action.removeBackground",
  "editor.visionSummary.action.detachObject",
  "editor.visionSummary.action.selectGlobe",
  "editor.visionSummary.action.replaceLogo",
  "editor.visionSummary.action.export",
];

export type EditorVisionSummary = {
  itemKeys: TranslationKey[];
  actionKeys: TranslationKey[];
  lowConfidence: boolean;
};

export function buildEditorVisionSummary(document: EditorCanvasDocument): EditorVisionSummary {
  const seen = new Set<string>();
  const itemKeys: TranslationKey[] = [];

  for (const layer of document.objects) {
    if (layer.layerType === "background") {
      const key = TYPE_ITEM_KEYS.background;
      if (!seen.has(key)) {
        seen.add(key);
        itemKeys.push(key);
      }
      continue;
    }
    const humanType = resolveHumanFirstObjectType(layer);
    const key = TYPE_ITEM_KEYS[humanType] ?? TYPE_ITEM_KEYS.object;
    if (!seen.has(key)) {
      seen.add(key);
      itemKeys.push(key);
    }
    if (
      humanType === "globe" &&
      (layer.category === "character" || layer.semanticType === "character" || layer.semanticType === "mascot")
    ) {
      const characterKey = TYPE_ITEM_KEYS.character;
      if (!seen.has(characterKey)) {
        seen.add(characterKey);
        itemKeys.push(characterKey);
      }
    }
  }

  if (itemKeys.length === 0) {
    itemKeys.push(TYPE_ITEM_KEYS.object);
  }

  const approximateCount = document.objects.filter(
    (o) => o.layerType !== "background" && isApproximateEditorSelection(o)
  ).length;
  const objectCount = document.objects.filter((o) => o.layerType !== "background").length;
  const lowConfidence =
    objectCount === 0 ||
    approximateCount >= objectCount ||
    Boolean(document.detectionMeta?.userMessageKey);

  const actionKeys = [...SUGGESTED_ACTION_KEYS];
  if (!seen.has(TYPE_ITEM_KEYS.globe)) {
    const idx = actionKeys.indexOf("editor.visionSummary.action.selectGlobe");
    if (idx >= 0) {
      actionKeys.splice(idx, 1);
    }
  }
  if (!seen.has(TYPE_ITEM_KEYS.logo)) {
    const idx = actionKeys.indexOf("editor.visionSummary.action.replaceLogo");
    if (idx >= 0) {
      actionKeys.splice(idx, 1);
    }
  }

  return { itemKeys, actionKeys, lowConfidence };
}
