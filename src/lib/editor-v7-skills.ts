import type { EditorV7DetectedIntent } from "@/lib/editor-v7-intent";
import type { EditorV7SkillId } from "@/types/homecheff-visual-editor";

export type EditorV7SkillDefinition = {
  id: EditorV7SkillId;
  labelKey: string;
  matchTerms: string[];
  intents: EditorV7DetectedIntent[];
};

export const EDITOR_V7_SKILL_DEFINITIONS: EditorV7SkillDefinition[] = [
  {
    id: "restaurant_poster",
    labelKey: "editor.v7.skill.restaurantPoster",
    matchTerms: ["restaurant poster", "restaurant branding", "restaurant using homecheff"],
    intents: [
      { actionType: "background_remove", labelKey: "editor.v7.plan.removeBackground" },
      { actionType: "align", labelKey: "editor.v7.plan.improveComposition", params: { action: "center" } },
      { actionType: "brand_kit", labelKey: "editor.v7.plan.addBranding" },
      { actionType: "poster_template", labelKey: "editor.v7.plan.createPoster", params: { template: "restaurant" } },
      { actionType: "print_export", labelKey: "editor.v7.plan.printExport" },
    ],
  },
  {
    id: "marketplace_product",
    labelKey: "editor.v7.skill.marketplaceProduct",
    matchTerms: ["marketplace product", "product photo", "marketplace"],
    intents: [
      { actionType: "background_remove", labelKey: "editor.v7.plan.removeBackground" },
      { actionType: "align", labelKey: "editor.v7.plan.improveComposition", params: { action: "center" } },
      { actionType: "poster_template", labelKey: "editor.v7.plan.createPoster", params: { template: "marketplace" } },
    ],
  },
  {
    id: "motion_ready_asset",
    labelKey: "editor.v7.skill.motionReadyAsset",
    matchTerms: ["motion ready asset", "prepare motion asset", "motion-ready asset"],
    intents: [
      { actionType: "cutout", labelKey: "editor.v7.plan.createCutout" },
      { actionType: "motion_ready", labelKey: "editor.v7.plan.motionReady" },
    ],
  },
  {
    id: "logo_placement",
    labelKey: "editor.v7.skill.logoPlacement",
    matchTerms: ["logo placement", "add logo flow", "place my logo"],
    intents: [
      { actionType: "detect_object", labelKey: "editor.v7.plan.detectLogoTarget" },
      { actionType: "logo_placement", labelKey: "editor.v7.plan.addLogo" },
    ],
  },
  {
    id: "background_cleanup",
    labelKey: "editor.v7.skill.backgroundCleanup",
    matchTerms: ["background cleanup", "clean background", "clean up background"],
    intents: [
      { actionType: "background_remove", labelKey: "editor.v7.plan.removeBackground" },
      { actionType: "background_tool", labelKey: "editor.v7.plan.blurBackground", params: { tool: "blur" } },
    ],
  },
  {
    id: "social_media_post",
    labelKey: "editor.v7.skill.socialMediaPost",
    matchTerms: ["social media post", "social post", "instagram version"],
    intents: [
      { actionType: "align", labelKey: "editor.v7.plan.improveComposition", params: { action: "center" } },
      { actionType: "social_preset", labelKey: "editor.v7.plan.socialExport", params: { preset: "instagram_post" } },
    ],
  },
  {
    id: "menu_design",
    labelKey: "editor.v7.skill.menuDesign",
    matchTerms: ["menu design", "restaurant menu", "create menu"],
    intents: [
      { actionType: "brand_kit", labelKey: "editor.v7.plan.addBranding" },
      { actionType: "poster_template", labelKey: "editor.v7.plan.createPoster", params: { template: "menu" } },
      { actionType: "print_export", labelKey: "editor.v7.plan.printExport" },
    ],
  },
  {
    id: "print_ready_export",
    labelKey: "editor.v7.skill.printReadyExport",
    matchTerms: ["print ready", "print-ready export", "prepare print"],
    intents: [
      { actionType: "poster_template", labelKey: "editor.v7.plan.createPoster", params: { template: "a3" } },
      { actionType: "print_export", labelKey: "editor.v7.plan.printExport" },
    ],
  },
];

export function matchEditorSkill(prompt: string): EditorV7SkillDefinition | null {
  const lower = prompt.toLowerCase();
  for (const skill of EDITOR_V7_SKILL_DEFINITIONS) {
    if (skill.matchTerms.some((term) => lower.includes(term))) {
      return skill;
    }
  }
  return null;
}
