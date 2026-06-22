import type {
  EditorCanvasBounds,
  EditorPartCategory,
  EditorShapePoint,
  EditorVisionPartSource,
} from "@/types/homecheff-visual-editor";

export type IllustrationPartSpec = {
  key: string;
  label: string;
  category: EditorPartCategory;
  parentKey?: string;
  group: "character" | "prop" | "background" | "style";
  bbox: EditorCanvasBounds;
  source: EditorVisionPartSource;
  confidence: number;
  editable: boolean;
  /** UI tab grouping for taxonomy-driven hierarchy panels. */
  taxonomyTab?: string;
  /** Segmentation mask URL or inline mask reference — counts as visual evidence. */
  mask?: string;
  /** Polygon outline — counts as visual evidence. */
  polygon?: EditorShapePoint[];
};

export type IllustrationPartAnalysisResult = {
  /** Vision-detected and estimated parts only — never taxonomy fallback. */
  parts: IllustrationPartSpec[];
  /** Creative capabilities / morph actions from taxonomy — not detections. */
  creativeCapabilities?: IllustrationPartSpec[];
  characterLabel: string;
  propLabel?: string;
  openAiUsed: boolean;
  templateUsed: boolean;
};

export type IllustrationPartAnalysisJson = {
  characterLabel?: string;
  propLabel?: string;
  parts?: Array<{
    key: string;
    label: string;
    category?: string;
    parentKey?: string | null;
    group?: "character" | "prop" | "background" | "style";
    bbox?: EditorCanvasBounds;
    confidence?: number;
    editable?: boolean;
  }>;
};
