import { resolveHumanFirstObjectType } from "@/lib/editor-ux-cleanup";
import type { EditorCanvasDocument, EditorCanvasLayer } from "@/types/homecheff-visual-editor";

export type EditorV7ObjectRefKind =
  | "character"
  | "globe"
  | "logo"
  | "text"
  | "background"
  | "jacket"
  | "shirt"
  | "object";

const REF_ALIASES: Record<EditorV7ObjectRefKind, string[]> = {
  character: ["character", "person", "personage", "chef", "mascot", "him", "her", "they"],
  globe: ["globe", "world", "wereldbol", "planet", "earth"],
  logo: ["logo", "brand mark", "brandmark"],
  text: ["text", "tekst", "title", "heading", "label"],
  background: ["background", "bg", "achtergrond"],
  jacket: ["jacket", "jas", "coat", "chef jacket"],
  shirt: ["shirt", "blouse", "top", "clothing"],
  object: ["object", "item", "prop"],
};

function layerMatchesRef(layer: EditorCanvasLayer, ref: EditorV7ObjectRefKind): boolean {
  const type = resolveHumanFirstObjectType(layer);
  const label = layer.label.toLowerCase();
  const category = (layer.category ?? "").toLowerCase();
  const semantic = (layer.semanticType ?? "").toLowerCase();

  if (ref === "jacket" || ref === "shirt") {
    if (type === "character") {
      return true;
    }
    return (
      label.includes("jacket") ||
      label.includes("jas") ||
      label.includes("shirt") ||
      category.includes("clothing")
    );
  }

  if (ref === "character" && type === "character") {
    return true;
  }
  if (ref === "globe" && type === "globe") {
    return true;
  }
  if (ref === "logo" && type === "logo") {
    return true;
  }
  if (ref === "text" && type === "text") {
    return true;
  }
  if (ref === "background" && type === "background") {
    return true;
  }

  const aliases = REF_ALIASES[ref];
  return aliases.some(
    (alias) => label.includes(alias) || category.includes(alias) || semantic.includes(alias)
  );
}

export function inferObjectRefFromPrompt(prompt: string): EditorV7ObjectRefKind | null {
  const lower = prompt.toLowerCase();
  const order: EditorV7ObjectRefKind[] = [
    "jacket",
    "shirt",
    "globe",
    "logo",
    "text",
    "background",
    "character",
    "object",
  ];
  for (const ref of order) {
    if (REF_ALIASES[ref].some((alias) => lower.includes(alias))) {
      return ref;
    }
  }
  return null;
}

export function resolveLayerByObjectRef(
  document: EditorCanvasDocument,
  ref: EditorV7ObjectRefKind
): EditorCanvasLayer | null {
  const candidates = document.objects.filter(
    (layer) => layer.visible !== false && layer.layerType !== "background" || ref === "background"
  );

  if (ref === "background") {
    return document.objects.find((l) => l.layerType === "background") ?? null;
  }

  const direct = candidates.find((layer) => layerMatchesRef(layer, ref));
  if (direct) {
    return direct;
  }

  if (ref === "jacket" || ref === "shirt") {
    return candidates.find((l) => resolveHumanFirstObjectType(l) === "character") ?? null;
  }

  return null;
}

export function resolveLayersToPreserve(
  document: EditorCanvasDocument,
  excludeLayerId?: string
): EditorCanvasLayer[] {
  return document.objects.filter((layer) => {
    if (layer.id === excludeLayerId || layer.layerType === "background") {
      return false;
    }
    const type = resolveHumanFirstObjectType(layer);
    return type === "logo" || type === "background" || type === "character" || type === "globe";
  });
}

export function humanLabelsForLayers(layers: EditorCanvasLayer[]): string[] {
  return layers.map((l) => l.label).filter(Boolean);
}
