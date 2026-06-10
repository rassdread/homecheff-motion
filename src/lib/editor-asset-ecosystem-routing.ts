import type {
  EditorEcosystemDestination,
  EditorAssetType,
  EditorLibraryIntelligence,
} from "@/types/editor-asset-profile";
import type { EditorCanvasDocument, EditorLibraryExportCategory } from "@/types/homecheff-visual-editor";

const DESTINATION_BY_TYPE: Record<EditorAssetType, EditorEcosystemDestination> = {
  logo: "brand_kit",
  brand_asset: "brand_kit",
  mascot: "library_characters",
  character: "library_characters",
  motion_asset: "motion_assets",
  poster: "print_assets",
  flyer: "print_assets",
  food: "marketplace_assets",
  product: "marketplace_assets",
  scene: "studio_assets",
  photo: "studio_assets",
  plant: "library_garden",
  garden_asset: "library_garden",
  background: "library_design",
  object_collection: "library_design",
  text_design: "library_design",
};

const SECTION_KEYS: Record<EditorEcosystemDestination, string> = {
  brand_kit: "editor.assetIntel.section.brandKit",
  library_characters: "editor.assetIntel.section.characters",
  library_logos: "editor.assetIntel.section.logos",
  motion_assets: "editor.assetIntel.section.motion",
  print_assets: "editor.assetIntel.section.print",
  marketplace_assets: "editor.assetIntel.section.marketplace",
  studio_assets: "editor.assetIntel.section.studio",
  library_food: "editor.assetIntel.section.food",
  library_garden: "editor.assetIntel.section.garden",
  library_design: "editor.assetIntel.section.design",
  library_motion: "editor.assetIntel.section.motion",
  library_posters: "editor.assetIntel.section.posters",
};

const CATEGORY_BY_DESTINATION: Record<EditorEcosystemDestination, EditorLibraryExportCategory> = {
  brand_kit: "edited_image",
  library_characters: "edited_image",
  library_logos: "edited_image",
  motion_assets: "motion_ready",
  print_assets: "print_ready",
  marketplace_assets: "edited_image",
  studio_assets: "composition",
  library_food: "edited_image",
  library_garden: "edited_image",
  library_design: "composition",
  library_motion: "motion_ready",
  library_posters: "print_ready",
};

export function resolveEcosystemDestination(assetType: EditorAssetType): EditorEcosystemDestination {
  return DESTINATION_BY_TYPE[assetType] ?? "library_design";
}

export function resolveLibraryIntelligence(
  assetType: EditorAssetType,
  document: EditorCanvasDocument
): EditorLibraryIntelligence {
  let destination = resolveEcosystemDestination(assetType);
  if ((document.cutoutAssets?.length ?? 0) > 0) {
    destination = "motion_assets";
  }
  if (document.editorFlowMode === "export") {
    destination = assetType === "poster" || assetType === "flyer" ? "print_assets" : destination;
  }
  return {
    autoCategory: CATEGORY_BY_DESTINATION[destination],
    sectionKey: SECTION_KEYS[destination],
    destination,
  };
}
