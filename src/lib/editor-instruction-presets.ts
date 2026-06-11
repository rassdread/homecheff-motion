import type { EditorCreatorPreset, EditorCreatorPresetId } from "@/types/editor-instruction-studio";

export const EDITOR_CREATOR_PRESETS: Record<EditorCreatorPresetId, EditorCreatorPreset> = {
  chef: {
    id: "chef",
    labelKey: "editor.instructionStudio.v2.preset.chef.title",
    descriptionKey: "editor.instructionStudio.v2.preset.chef.description",
    variants: [
      {
        id: "chef_professional",
        labelKey: "editor.instructionStudio.v2.preset.chef.professional",
        promptSuffix: "Professional food branding with clean studio lighting and premium menu-ready presentation.",
        action: "change_style",
      },
      {
        id: "chef_menu",
        labelKey: "editor.instructionStudio.v2.preset.chef.menu",
        promptSuffix: "Menu photography style with appetizing highlights and restaurant-ready composition.",
        action: "change_style",
      },
      {
        id: "chef_packaging",
        labelKey: "editor.instructionStudio.v2.preset.chef.packaging",
        promptSuffix: "Packaging branding with clear product label hierarchy and delivery-ready presentation.",
        action: "premium_packaging",
      },
      {
        id: "chef_delivery",
        labelKey: "editor.instructionStudio.v2.preset.chef.delivery",
        promptSuffix: "Delivery-ready branding with bold readable logo placement and practical takeaway styling.",
        action: "add_logo",
      },
    ],
  },
  garden: {
    id: "garden",
    labelKey: "editor.instructionStudio.v2.preset.garden.title",
    descriptionKey: "editor.instructionStudio.v2.preset.garden.description",
    variants: [
      {
        id: "garden_organic",
        labelKey: "editor.instructionStudio.v2.preset.garden.organic",
        promptSuffix: "Organic natural style with soft greens and earthy textures.",
        action: "change_style",
      },
      {
        id: "garden_eco",
        labelKey: "editor.instructionStudio.v2.preset.garden.eco",
        promptSuffix: "Eco branding with sustainable packaging cues and recyclable materials.",
        action: "eco_packaging",
      },
      {
        id: "garden_market",
        labelKey: "editor.instructionStudio.v2.preset.garden.market",
        promptSuffix: "Farmers market ready presentation with rustic charm and fresh produce emphasis.",
        action: "change_style",
      },
    ],
  },
  designer: {
    id: "designer",
    labelKey: "editor.instructionStudio.v2.preset.designer.title",
    descriptionKey: "editor.instructionStudio.v2.preset.designer.description",
    variants: [
      {
        id: "designer_apparel",
        labelKey: "editor.instructionStudio.v2.preset.designer.apparel",
        promptSuffix: "Apparel branding with clean logo placement on clothing and fashion-forward styling.",
        action: "add_logo",
      },
      {
        id: "designer_product",
        labelKey: "editor.instructionStudio.v2.preset.designer.product",
        promptSuffix: "Product showcase with studio lighting and portfolio-ready composition.",
        action: "change_style",
      },
      {
        id: "designer_portfolio",
        labelKey: "editor.instructionStudio.v2.preset.designer.portfolio",
        promptSuffix: "Portfolio-ready variant with refined typography and editorial layout polish.",
        action: "change_style",
      },
    ],
  },
};

export function listCreatorPresets(): EditorCreatorPreset[] {
  return Object.values(EDITOR_CREATOR_PRESETS);
}

export function findCreatorPreset(id: EditorCreatorPresetId): EditorCreatorPreset {
  return EDITOR_CREATOR_PRESETS[id];
}
