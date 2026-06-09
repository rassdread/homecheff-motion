/**
 * HomeCheff AI Suite — five-product platform architecture (Phase 5).
 * User-facing names: Editor, Studio, Motion, Publish, Library.
 * Internal ids `presentation` and `assets` remain stable for code compatibility.
 */

export const HOMECHEFF_PRODUCT_IDS = [
  "editor",
  "studio",
  "motion",
  "presentation",
  "assets",
] as const;

export type HomeCheffProductId = (typeof HOMECHEFF_PRODUCT_IDS)[number];

/** User-facing display label i18n keys (Publish / Library, not internal ids) */
export const SUITE_PRODUCT_DISPLAY_LABEL_KEYS: Record<HomeCheffProductId, string> = {
  editor: "suite.product.editor",
  studio: "suite.product.studio",
  motion: "suite.product.motion",
  presentation: "suite.product.publish",
  assets: "suite.product.library",
};

export const SUITE_PRODUCT_DISPLAY_DESCRIPTION_KEYS: Record<HomeCheffProductId, string> = {
  editor: "suite.product.editorDesc",
  studio: "suite.product.studioDesc",
  motion: "suite.product.motionDesc",
  presentation: "suite.product.publishDesc",
  assets: "suite.product.libraryDesc",
};

export const SUITE_SHARED_INFRASTRUCTURE = [
  "assets",
  "identity",
  "semantic_records",
  "qa",
  "storage",
  "permissions",
  "billing",
] as const;

export type SuiteSharedInfrastructureId = (typeof SUITE_SHARED_INFRASTRUCTURE)[number];

export type ProductOutputKind = "assets" | "scene_recipes" | "video" | "deliverables";

export type ProductWorkflowStepId =
  | "upload"
  | "vision"
  | "object_detection"
  | "visual_editor"
  | "review"
  | "save_asset"
  | "storyboards"
  | "director"
  | "scene_composition"
  | "motion"
  | "qa"
  | "video_upload"
  | "speech_analysis"
  | "subtitles"
  | "overlays"
  | "branding"
  | "exports";

export type HomeCheffProductDefinition = {
  id: HomeCheffProductId;
  labelKey: string;
  descriptionKey: string;
  /** Primary route when suite navigation is active */
  href: string;
  outputKind: ProductOutputKind;
  workflowStepIds: ProductWorkflowStepId[];
  consumesInfrastructure: SuiteSharedInfrastructureId[];
  standalone: boolean;
};

/** Integrated Studio flow — user sees one journey, products share infrastructure */
export const STUDIO_INTEGRATED_PRODUCT_FLOW: HomeCheffProductId[] = [
  "editor",
  "studio",
  "motion",
  "presentation",
];

export const SUITE_ARCHITECTURE_VERSION = "phase5-v1" as const;
