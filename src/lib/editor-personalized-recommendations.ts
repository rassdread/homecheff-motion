import {
  findCreatorPreset,
  listCreatorPresets,
} from "@/lib/editor-instruction-presets";
import { EDITOR_STYLE_ACTIONS, type EditorStyleActionOption } from "@/lib/editor-style-actions";
import type { EditorRecommendationContext, EditorUserCategory } from "@/lib/editor-recommendation-context";
import type { EditorAssetType } from "@/types/editor-asset-profile";
import type { EditorCreatorPreset, EditorCreatorPresetId } from "@/types/editor-instruction-studio";
import type { EditorStyleAttribute } from "@/types/editor-instruction-studio";
import type { TranslationKey } from "@/i18n";

const GENERIC_MAGIC_PLACEHOLDERS = [
  "editor.rec.generic.magic.placeholder1",
  "editor.rec.generic.magic.placeholder2",
  "editor.rec.generic.magic.placeholder3",
  "editor.rec.generic.magic.placeholder4",
] as const satisfies readonly TranslationKey[];

const HOMECHEFF_MAGIC_PLACEHOLDERS = [
  "editor.rec.homecheff.magic.placeholder1",
  "editor.rec.homecheff.magic.placeholder2",
  "editor.rec.homecheff.magic.placeholder3",
  "editor.rec.homecheff.magic.placeholder4",
] as const satisfies readonly TranslationKey[];

const CHEF_MAGIC_PLACEHOLDERS = [
  "editor.rec.chef.magic.placeholder1",
  "editor.rec.chef.magic.placeholder2",
  "editor.rec.chef.magic.placeholder3",
  "editor.rec.chef.magic.placeholder4",
] as const satisfies readonly TranslationKey[];

const GARDEN_MAGIC_PLACEHOLDERS = [
  "editor.rec.garden.magic.placeholder1",
  "editor.rec.garden.magic.placeholder2",
  "editor.rec.garden.magic.placeholder3",
  "editor.rec.garden.magic.placeholder4",
] as const satisfies readonly TranslationKey[];

const DESIGNER_MAGIC_PLACEHOLDERS = [
  "editor.rec.designer.magic.placeholder1",
  "editor.rec.designer.magic.placeholder2",
  "editor.rec.designer.magic.placeholder3",
  "editor.rec.designer.magic.placeholder4",
] as const satisfies readonly TranslationKey[];

const GENERIC_COMMAND_EXAMPLES = [
  "editor.rec.generic.command.example1",
  "editor.rec.generic.command.example2",
  "editor.rec.generic.command.example3",
  "editor.rec.generic.command.example4",
] as const satisfies readonly TranslationKey[];

const HOMECHEFF_COMMAND_EXAMPLES = [
  "editor.rec.homecheff.command.example1",
  "editor.rec.homecheff.command.example2",
  "editor.rec.homecheff.command.example3",
  "editor.rec.homecheff.command.example4",
] as const satisfies readonly TranslationKey[];

const CATEGORY_COMMAND_EXAMPLES: Record<Exclude<EditorUserCategory, "generic" | "homecheff">, readonly TranslationKey[]> = {
  chef: [
    "editor.rec.chef.command.example1",
    "editor.rec.chef.command.example2",
    "editor.rec.chef.command.example3",
    "editor.rec.chef.command.example4",
  ],
  garden: [
    "editor.rec.garden.command.example1",
    "editor.rec.garden.command.example2",
    "editor.rec.garden.command.example3",
    "editor.rec.garden.command.example4",
  ],
  designer: [
    "editor.rec.designer.command.example1",
    "editor.rec.designer.command.example2",
    "editor.rec.designer.command.example3",
    "editor.rec.designer.command.example4",
  ],
};

const WORKFLOW_DIRECTOR_PLACEHOLDERS: Record<string, TranslationKey> = {
  edit: "editor.rec.director.placeholder.edit",
  combine: "editor.rec.director.placeholder.combine",
  motion_prepare: "editor.rec.director.placeholder.motion",
  export: "editor.rec.director.placeholder.export",
};

const ASSET_SUMMARY_KEYS: Record<EditorAssetType, { generic: TranslationKey; homecheff?: TranslationKey }> = {
  mascot: {
    generic: "editor.rec.assetSummary.mascot",
    homecheff: "editor.rec.homecheff.assetSummary.mascot",
  },
  character: { generic: "editor.assetIntel.summary.character" },
  logo: { generic: "editor.assetIntel.summary.logo" },
  product: { generic: "editor.assetIntel.summary.product" },
  food: { generic: "editor.assetIntel.summary.food" },
  plant: { generic: "editor.assetIntel.summary.plant" },
  garden_asset: { generic: "editor.assetIntel.summary.garden" },
  poster: { generic: "editor.assetIntel.summary.poster" },
  flyer: { generic: "editor.assetIntel.summary.flyer" },
  photo: { generic: "editor.assetIntel.summary.photo" },
  scene: { generic: "editor.assetIntel.summary.scene" },
  background: { generic: "editor.assetIntel.summary.background" },
  object_collection: { generic: "editor.assetIntel.summary.collection" },
  text_design: { generic: "editor.assetIntel.summary.text" },
  motion_asset: { generic: "editor.assetIntel.summary.motion" },
  brand_asset: { generic: "editor.assetIntel.summary.brand" },
};

function categoryMagicPlaceholders(category: EditorUserCategory): readonly TranslationKey[] {
  switch (category) {
    case "homecheff":
      return HOMECHEFF_MAGIC_PLACEHOLDERS;
    case "chef":
      return CHEF_MAGIC_PLACEHOLDERS;
    case "garden":
      return GARDEN_MAGIC_PLACEHOLDERS;
    case "designer":
      return DESIGNER_MAGIC_PLACEHOLDERS;
    default:
      return GENERIC_MAGIC_PLACEHOLDERS;
  }
}

export function resolveMagicPlaceholderKeys(ctx: EditorRecommendationContext): readonly TranslationKey[] {
  if (ctx.showHomeCheffExamples) {
    return HOMECHEFF_MAGIC_PLACEHOLDERS;
  }
  return categoryMagicPlaceholders(ctx.userCategory);
}

export function resolveCommandExampleKeys(ctx: EditorRecommendationContext): readonly TranslationKey[] {
  if (ctx.showHomeCheffExamples) {
    return HOMECHEFF_COMMAND_EXAMPLES;
  }
  if (ctx.userCategory === "chef" || ctx.userCategory === "garden" || ctx.userCategory === "designer") {
    return CATEGORY_COMMAND_EXAMPLES[ctx.userCategory];
  }
  return GENERIC_COMMAND_EXAMPLES;
}

export function resolveDirectorPlaceholderKey(ctx: EditorRecommendationContext): TranslationKey {
  if (ctx.showHomeCheffExamples) {
    return "editor.rec.homecheff.director.placeholder";
  }
  if (ctx.hasUserBrandAssets) {
    return "editor.rec.brand.director.placeholder";
  }
  if (ctx.workflow && WORKFLOW_DIRECTOR_PLACEHOLDERS[ctx.workflow]) {
    return WORKFLOW_DIRECTOR_PLACEHOLDERS[ctx.workflow]!;
  }
  return "editor.rec.generic.director.placeholder";
}

export function resolveDirectorSuggestionKeys(input: {
  ctx: EditorRecommendationContext;
  hasClothing: boolean;
  promptLower: string;
}): TranslationKey[] {
  const keys: TranslationKey[] = [];
  const { ctx, hasClothing, promptLower } = input;

  if (hasClothing) {
    keys.push(
      ctx.hasUserBrandAssets || ctx.showHomeCheffExamples
        ? "editor.rec.director.suggest.logoOnClothing"
        : "editor.rec.director.suggest.logoPlacementGeneric"
    );
  }

  if (/packaging|product/.test(promptLower)) {
    keys.push(
      ctx.userCategory === "chef"
        ? "editor.rec.chef.director.suggest.menuPackaging"
        : "editor.instructionStudio.v2.director.suggest.packaging"
    );
  }

  if (!/motion|video|print|social/.test(promptLower)) {
    if (ctx.workflow === "motion_prepare") {
      keys.push("editor.instructionStudio.v2.director.suggest.motionReady");
    } else if (ctx.workflow === "export") {
      keys.push("editor.rec.director.suggest.exportReady");
    } else {
      keys.push("editor.instructionStudio.v2.director.suggest.socialVersion");
      if (ctx.assetType === "mascot" || ctx.assetType === "character") {
        keys.push("editor.instructionStudio.v2.director.suggest.motionReady");
      }
    }
  }

  return keys;
}

export function resolveAssetSummaryKey(
  ctx: EditorRecommendationContext,
  assetType: EditorAssetType
): TranslationKey {
  const entry = ASSET_SUMMARY_KEYS[assetType] ?? ASSET_SUMMARY_KEYS.photo;
  if (ctx.showHomeCheffExamples && entry.homecheff) {
    return entry.homecheff;
  }
  return entry.generic;
}

export function listCreatorPresetsForContext(ctx: EditorRecommendationContext): EditorCreatorPreset[] {
  if (ctx.showHomeCheffExamples && ctx.isAdmin) {
    return listCreatorPresets();
  }

  const presetForCategory = (id: EditorCreatorPresetId): EditorCreatorPreset[] => [
    findCreatorPreset(id),
  ];

  switch (ctx.userCategory) {
    case "chef":
      return presetForCategory("chef");
    case "garden":
      return presetForCategory("garden");
    case "designer":
      return presetForCategory("designer");
    case "homecheff":
      return listCreatorPresets();
    default:
      if (ctx.assetType === "food") {
        return presetForCategory("chef");
      }
      if (ctx.assetType === "garden_asset" || ctx.assetType === "plant") {
        return presetForCategory("garden");
      }
      if (ctx.assetType === "product") {
        return presetForCategory("designer");
      }
      return [];
  }
}

export function resolveStyleActionsForContext(
  ctx: EditorRecommendationContext,
  attribute: EditorStyleAttribute
): EditorStyleActionOption[] {
  const actions = EDITOR_STYLE_ACTIONS[attribute];
  if (attribute !== "brand_colors") {
    return actions;
  }
  return actions.filter(
    (action) => ctx.showHomeCheffExamples || action.id !== "stronger_homecheff"
  );
}

export function resolveBrandColorsActionLabelKey(ctx: EditorRecommendationContext): TranslationKey {
  return ctx.showHomeCheffExamples
    ? "editor.rec.homecheff.style.brandColors.stronger"
    : "editor.instructionStudio.v2.style.brandColors.stronger";
}

export function resolveBrandColorsInstructionSuffix(ctx: EditorRecommendationContext): string {
  if (ctx.showHomeCheffExamples) {
    return "stronger HomeCheff brand colors";
  }
  if (ctx.hasUserBrandAssets) {
    return `stronger ${ctx.brandName} brand colors`;
  }
  return "stronger brand colors";
}

export function resolveCompositionBrandIdentity(ctx: EditorRecommendationContext, explicit?: string): string {
  const trimmed = explicit?.trim();
  if (trimmed && !trimmed.startsWith("editor.")) {
    return trimmed;
  }
  if (ctx.showHomeCheffExamples) {
    return "HomeCheff";
  }
  if (ctx.hasUserBrandAssets) {
    return ctx.brandName;
  }
  return "the brand";
}

export function resolvePreserveBrandLine(ctx: EditorRecommendationContext): string {
  if (ctx.showHomeCheffExamples) {
    return "- HomeCheff branding";
  }
  if (ctx.hasUserBrandAssets) {
    return `- ${ctx.brandName} branding`;
  }
  return "- brand identity";
}
