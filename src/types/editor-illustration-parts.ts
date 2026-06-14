import type { EditorCanvasBounds, EditorPartCategory, EditorVisionPartSource } from "@/types/homecheff-visual-editor";

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
};

export type IllustrationPartAnalysisResult = {
  parts: IllustrationPartSpec[];
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
