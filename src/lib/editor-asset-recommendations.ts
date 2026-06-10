import type {
  EditorAssetProfile,
  EditorAssetRecommendation,
  EditorAssetRecommendationId,
  EditorAssetType,
} from "@/types/editor-asset-profile";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { EditorV7ContextualSuggestion } from "@/types/homecheff-visual-editor";
import type { EditorHumanSuggestion } from "@/lib/editor-human-first";
import type { TranslationKey } from "@/i18n";

type RecTemplate = {
  id: EditorAssetRecommendationId;
  labelKey: string;
  reasonKey: string;
  prompt?: string;
};

const BY_TYPE: Record<EditorAssetType, RecTemplate[]> = {
  mascot: [
    { id: "motion_ready", labelKey: "editor.assetIntel.rec.motionReady", reasonKey: "editor.assetIntel.reason.mascotMotion", prompt: "Make this motion-ready" },
    { id: "make_transparent", labelKey: "editor.assetIntel.rec.transparent", reasonKey: "editor.assetIntel.reason.transparent", prompt: "Remove background" },
    { id: "add_to_studio", labelKey: "editor.assetIntel.rec.addStudio", reasonKey: "editor.assetIntel.reason.mascotStudio" },
    { id: "save_as_mascot", labelKey: "editor.assetIntel.rec.saveMascot", reasonKey: "editor.assetIntel.reason.saveLibrary" },
  ],
  character: [
    { id: "motion_ready", labelKey: "editor.assetIntel.rec.motionReady", reasonKey: "editor.assetIntel.reason.characterMotion", prompt: "Make this motion-ready" },
    { id: "make_transparent", labelKey: "editor.assetIntel.rec.transparent", reasonKey: "editor.assetIntel.reason.transparent", prompt: "Remove background" },
    { id: "add_to_studio", labelKey: "editor.assetIntel.rec.addStudio", reasonKey: "editor.assetIntel.reason.characterStudio" },
    { id: "save_to_library", labelKey: "editor.assetIntel.rec.saveLibrary", reasonKey: "editor.assetIntel.reason.saveLibrary" },
  ],
  logo: [
    { id: "add_to_brand_kit", labelKey: "editor.assetIntel.rec.brandKit", reasonKey: "editor.assetIntel.reason.logoBrand" },
    { id: "make_transparent", labelKey: "editor.assetIntel.rec.transparentLogo", reasonKey: "editor.assetIntel.reason.logoTransparent", prompt: "Remove background" },
    { id: "use_in_motion", labelKey: "editor.assetIntel.rec.useMotion", reasonKey: "editor.assetIntel.reason.logoMotion" },
  ],
  poster: [
    { id: "print_export", labelKey: "editor.assetIntel.rec.print", reasonKey: "editor.assetIntel.reason.posterPrint" },
    { id: "social_export", labelKey: "editor.assetIntel.rec.social", reasonKey: "editor.assetIntel.reason.posterSocial", prompt: "Make this suitable for Instagram" },
    { id: "duplicate_format", labelKey: "editor.assetIntel.rec.duplicateFormat", reasonKey: "editor.assetIntel.reason.posterDuplicate" },
  ],
  flyer: [
    { id: "print_export", labelKey: "editor.assetIntel.rec.print", reasonKey: "editor.assetIntel.reason.flyerPrint" },
    { id: "social_export", labelKey: "editor.assetIntel.rec.social", reasonKey: "editor.assetIntel.reason.flyerSocial" },
    { id: "duplicate_format", labelKey: "editor.assetIntel.rec.duplicateFormat", reasonKey: "editor.assetIntel.reason.flyerDuplicate" },
  ],
  food: [
    { id: "marketplace_listing", labelKey: "editor.assetIntel.rec.marketplace", reasonKey: "editor.assetIntel.reason.foodMarket" },
    { id: "restaurant_poster", labelKey: "editor.assetIntel.rec.restaurantPoster", reasonKey: "editor.assetIntel.reason.foodPoster", prompt: "Turn this into a restaurant poster" },
    { id: "social_content", labelKey: "editor.assetIntel.rec.socialContent", reasonKey: "editor.assetIntel.reason.foodSocial", prompt: "Make this suitable for Instagram" },
  ],
  product: [
    { id: "marketplace_listing", labelKey: "editor.assetIntel.rec.marketplace", reasonKey: "editor.assetIntel.reason.productMarket" },
    { id: "social_export", labelKey: "editor.assetIntel.rec.social", reasonKey: "editor.assetIntel.reason.productSocial" },
    { id: "print_export", labelKey: "editor.assetIntel.rec.print", reasonKey: "editor.assetIntel.reason.productPrint" },
  ],
  scene: [
    { id: "add_to_studio", labelKey: "editor.assetIntel.rec.addStudio", reasonKey: "editor.assetIntel.reason.sceneStudio" },
    { id: "use_in_motion", labelKey: "editor.assetIntel.rec.useMotion", reasonKey: "editor.assetIntel.reason.sceneMotion" },
    { id: "save_to_library", labelKey: "editor.assetIntel.rec.saveLibrary", reasonKey: "editor.assetIntel.reason.sceneLibrary" },
  ],
  photo: [
    { id: "remove_background", labelKey: "editor.assetIntel.rec.removeBg", reasonKey: "editor.assetIntel.reason.photoBg", prompt: "Remove background" },
    { id: "create_cutout", labelKey: "editor.assetIntel.rec.cutout", reasonKey: "editor.assetIntel.reason.photoCutout" },
    { id: "social_export", labelKey: "editor.assetIntel.rec.social", reasonKey: "editor.assetIntel.reason.photoSocial" },
  ],
  plant: [
    { id: "add_to_studio", labelKey: "editor.assetIntel.rec.addStudio", reasonKey: "editor.assetIntel.reason.plantStudio" },
    { id: "save_to_library", labelKey: "editor.assetIntel.rec.saveLibrary", reasonKey: "editor.assetIntel.reason.plantLibrary" },
    { id: "social_content", labelKey: "editor.assetIntel.rec.socialContent", reasonKey: "editor.assetIntel.reason.plantSocial" },
  ],
  garden_asset: [
    { id: "add_to_studio", labelKey: "editor.assetIntel.rec.addStudio", reasonKey: "editor.assetIntel.reason.gardenStudio" },
    { id: "save_to_library", labelKey: "editor.assetIntel.rec.saveLibrary", reasonKey: "editor.assetIntel.reason.gardenLibrary" },
    { id: "social_content", labelKey: "editor.assetIntel.rec.socialContent", reasonKey: "editor.assetIntel.reason.gardenSocial" },
  ],
  background: [
    { id: "add_to_studio", labelKey: "editor.assetIntel.rec.addStudio", reasonKey: "editor.assetIntel.reason.bgStudio" },
    { id: "use_in_motion", labelKey: "editor.assetIntel.rec.useMotion", reasonKey: "editor.assetIntel.reason.bgMotion" },
  ],
  object_collection: [
    { id: "create_cutout", labelKey: "editor.assetIntel.rec.cutout", reasonKey: "editor.assetIntel.reason.collectionCutout" },
    { id: "add_to_studio", labelKey: "editor.assetIntel.rec.addStudio", reasonKey: "editor.assetIntel.reason.collectionStudio" },
  ],
  text_design: [
    { id: "add_to_brand_kit", labelKey: "editor.assetIntel.rec.brandKit", reasonKey: "editor.assetIntel.reason.textBrand" },
    { id: "print_export", labelKey: "editor.assetIntel.rec.print", reasonKey: "editor.assetIntel.reason.textPrint" },
  ],
  motion_asset: [
    { id: "use_in_motion", labelKey: "editor.assetIntel.rec.useMotion", reasonKey: "editor.assetIntel.reason.motionAsset" },
    { id: "save_to_library", labelKey: "editor.assetIntel.rec.saveLibrary", reasonKey: "editor.assetIntel.reason.motionLibrary" },
  ],
  brand_asset: [
    { id: "add_to_brand_kit", labelKey: "editor.assetIntel.rec.brandKit", reasonKey: "editor.assetIntel.reason.brandAsset" },
    { id: "add_to_studio", labelKey: "editor.assetIntel.rec.addStudio", reasonKey: "editor.assetIntel.reason.brandStudio" },
  ],
};

export function recommendationsForAssetType(
  assetType: EditorAssetType,
  document: EditorCanvasDocument,
  motionScore: number
): EditorAssetRecommendation[] {
  const base = BY_TYPE[assetType] ?? BY_TYPE.photo;
  let recs = [...base];
  if (motionScore >= 85) {
    recs = recs.filter((r) => r.id !== "motion_ready" && r.id !== "make_transparent");
  }
  if ((document.cutoutAssets?.length ?? 0) > 0) {
    recs = recs.filter((r) => r.id !== "create_cutout");
  }
  return recs.slice(0, 4);
}

export function profileToHumanSuggestions(
  profile: EditorAssetProfile | undefined
): EditorHumanSuggestion[] {
  if (!profile) {
    return [];
  }
  return profile.recommendedActions.map((rec) => ({
    id: rec.id,
    labelKey: rec.labelKey as TranslationKey,
  }));
}

export function profileToV7Suggestions(
  profile: EditorAssetProfile | undefined
): EditorV7ContextualSuggestion[] {
  if (!profile) {
    return [];
  }
  return profile.recommendedActions
    .filter((rec) => rec.prompt)
    .map((rec) => ({
      id: rec.id,
      labelKey: rec.labelKey as TranslationKey,
      prompt: rec.prompt!,
    }));
}
