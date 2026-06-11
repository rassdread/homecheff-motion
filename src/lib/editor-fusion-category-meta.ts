import type { EditorFusionIntentCategory } from "@/types/editor-instruction-studio";

export type EditorFusionCategoryMeta = {
  icon: string;
  descriptionKey: string;
};

export const EDITOR_FUSION_CATEGORY_META: Record<EditorFusionIntentCategory, EditorFusionCategoryMeta> = {
  people_characters: {
    icon: "👤",
    descriptionKey: "editor.fusion.category.people_characters.description",
  },
  animals: {
    icon: "🐾",
    descriptionKey: "editor.fusion.category.animals.description",
  },
  products_brands: {
    icon: "📦",
    descriptionKey: "editor.fusion.category.products_brands.description",
  },
  marketing_content: {
    icon: "📣",
    descriptionKey: "editor.fusion.category.marketing_content.description",
  },
  future_identity: {
    icon: "🔮",
    descriptionKey: "editor.fusion.category.future_identity.description",
  },
};

export function fusionCategoryMeta(category: EditorFusionIntentCategory): EditorFusionCategoryMeta {
  return EDITOR_FUSION_CATEGORY_META[category];
}
