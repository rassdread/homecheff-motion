import { isStyleTrait } from "@/lib/editor-instruction-object-feed";
import {
  EDITOR_STYLE_ATTRIBUTES,
  type EditorStyleAttribute,
  type EditorStyleAttributeRecord,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

const TRAIT_TO_ATTRIBUTE: Array<{ pattern: RegExp; attribute: EditorStyleAttribute }> = [
  { pattern: /head\s*shape/i, attribute: "head_shape" },
  { pattern: /body\s*proportion|character\s*proportion/i, attribute: "body_proportions" },
  { pattern: /facial|face\s*style/i, attribute: "facial_style" },
  { pattern: /outline/i, attribute: "outline_style" },
  { pattern: /color\s*palette/i, attribute: "color_palette" },
  { pattern: /brand\s*color/i, attribute: "brand_colors" },
  { pattern: /illustration\s*style/i, attribute: "illustration_style" },
  { pattern: /silhouette/i, attribute: "silhouette" },
  { pattern: /visual\s*identity/i, attribute: "visual_identity" },
  { pattern: /identity\s*marker/i, attribute: "identity_markers" },
  { pattern: /line\s*weight/i, attribute: "line_weight" },
];

const DEFAULT_LABELS: Record<EditorStyleAttribute, string> = {
  head_shape: "Head Shape",
  body_proportions: "Body Proportions",
  facial_style: "Facial Style",
  outline_style: "Outline Style",
  color_palette: "Color Palette",
  brand_colors: "Brand Colors",
  illustration_style: "Illustration Style",
  silhouette: "Silhouette",
  visual_identity: "Visual Identity",
  identity_markers: "Identity Markers",
  line_weight: "Line Weight",
};

function traitToAttribute(trait: string): EditorStyleAttribute | undefined {
  for (const rule of TRAIT_TO_ATTRIBUTE) {
    if (rule.pattern.test(trait)) {
      return rule.attribute;
    }
  }
  if (isStyleTrait(trait)) {
    if (/proportion/i.test(trait)) {
      return "body_proportions";
    }
    if (/shape/i.test(trait)) {
      return "head_shape";
    }
  }
  return undefined;
}

export function buildStyleAttributeRecords(document: EditorCanvasDocument): EditorStyleAttributeRecord[] {
  const detected = new Map<EditorStyleAttribute, EditorStyleAttributeRecord>();
  const traitSources = [
    ...(document.instructionStudioState?.instructionObjects?.flatMap((o) => o.traits ?? []) ?? []),
    ...(document.semanticLayers?.map((l) => l.label) ?? []),
  ];

  for (const trait of traitSources) {
    const attribute = traitToAttribute(trait);
    if (!attribute || detected.has(attribute)) {
      continue;
    }
    detected.set(attribute, {
      id: `style_${attribute}`,
      attribute,
      label: DEFAULT_LABELS[attribute],
      confidence: 0.72,
      source: "semanticLayers",
      detectedFromAnalysis: true,
    });
  }

  return EDITOR_STYLE_ATTRIBUTES.map((attribute) => {
    const existing = detected.get(attribute);
    if (existing) {
      return existing;
    }
    return {
      id: `style_${attribute}`,
      attribute,
      label: DEFAULT_LABELS[attribute],
      confidence: 0.55,
      source: "heuristic",
      detectedFromAnalysis: false,
    };
  });
}

export function syncDocumentStyleAttributes(
  document: EditorCanvasDocument
): EditorCanvasDocument {
  const styleAttributes = buildStyleAttributeRecords(document);
  return {
    ...document,
    styleAttributes,
    updatedAt: new Date().toISOString(),
  };
}
