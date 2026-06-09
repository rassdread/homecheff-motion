import type { BillingProductPlan } from "@/types/homecheff-billing-foundation";
import {
  HOMECHEFF_PRODUCT_IDS,
  STUDIO_INTEGRATED_PRODUCT_FLOW,
  SUITE_ARCHITECTURE_VERSION,
  SUITE_PRODUCT_DISPLAY_DESCRIPTION_KEYS,
  SUITE_PRODUCT_DISPLAY_LABEL_KEYS,
  type HomeCheffProductDefinition,
  type HomeCheffProductId,
  type SuiteSharedInfrastructureId,
} from "@/types/homecheff-product-suite";
import {
  LIBRARY_HUB_BASE_PATH,
  resolvePublishEntryPath,
} from "@/lib/homecheff-suite-route-aliases";
import { EDITOR_WORKFLOW_STEP_IDS } from "@/types/homecheff-visual-editor";
import { PRESENTATION_WORKFLOW_STEP_IDS } from "@/types/homecheff-presentation-suite";

export {
  SUITE_ARCHITECTURE_VERSION,
  STUDIO_INTEGRATED_PRODUCT_FLOW,
  HOMECHEFF_PRODUCT_IDS,
  SUITE_PRODUCT_DISPLAY_LABEL_KEYS,
  SUITE_PRODUCT_DISPLAY_DESCRIPTION_KEYS,
};

export function resolveProductDisplayLabelKey(id: HomeCheffProductId): string {
  return SUITE_PRODUCT_DISPLAY_LABEL_KEYS[id];
}

export const HOMECHEFF_PRODUCT_DEFINITIONS: HomeCheffProductDefinition[] = [
  {
    id: "editor",
    labelKey: "suite.product.editor",
    descriptionKey: "suite.product.editorDesc",
    href: "/editor",
    outputKind: "assets",
    workflowStepIds: [...EDITOR_WORKFLOW_STEP_IDS],
    consumesInfrastructure: ["assets", "identity", "semantic_records", "qa", "storage", "permissions", "billing"],
    standalone: true,
  },
  {
    id: "studio",
    labelKey: "suite.product.studio",
    descriptionKey: "suite.product.studioDesc",
    href: "/studio",
    outputKind: "scene_recipes",
    workflowStepIds: ["save_asset", "storyboards", "director", "scene_composition", "motion"],
    consumesInfrastructure: ["assets", "identity", "semantic_records", "qa", "storage", "permissions", "billing"],
    standalone: true,
  },
  {
    id: "motion",
    labelKey: "suite.product.motion",
    descriptionKey: "suite.product.motionDesc",
    href: "/animate/instant",
    outputKind: "video",
    workflowStepIds: ["save_asset", "motion", "qa"],
    consumesInfrastructure: ["assets", "semantic_records", "qa", "storage", "permissions", "billing"],
    standalone: true,
  },
  {
    id: "presentation",
    labelKey: "suite.product.publish",
    descriptionKey: "suite.product.publishDesc",
    href: "/publish",
    outputKind: "deliverables",
    workflowStepIds: [...PRESENTATION_WORKFLOW_STEP_IDS],
    consumesInfrastructure: ["storage", "permissions", "billing", "qa"],
    standalone: true,
  },
  {
    id: "assets",
    labelKey: "suite.product.library",
    descriptionKey: "suite.product.libraryDesc",
    href: "/library",
    outputKind: "assets",
    workflowStepIds: ["save_asset"],
    consumesInfrastructure: ["storage", "permissions", "identity", "semantic_records"],
    standalone: true,
  },
];

export function resolveProductDefinition(id: HomeCheffProductId): HomeCheffProductDefinition | null {
  return HOMECHEFF_PRODUCT_DEFINITIONS.find((p) => p.id === id) ?? null;
}

/** User-facing suite routes alias to stable internal paths */
export function resolveProductHref(id: HomeCheffProductId): string {
  const def = resolveProductDefinition(id);
  if (!def) {
    return "/";
  }
  if (id === "editor") {
    return "/editor";
  }
  if (id === "presentation") {
    return "/publish";
  }
  if (id === "assets") {
    return "/library";
  }
  return def.href;
}

/** Internal destination after alias redirect */
export function resolveProductInternalHref(id: HomeCheffProductId): string {
  if (id === "presentation") {
    return resolvePublishEntryPath();
  }
  if (id === "assets") {
    return LIBRARY_HUB_BASE_PATH;
  }
  return resolveProductHref(id);
}

export function productConsumesInfrastructure(
  productId: HomeCheffProductId,
  infra: SuiteSharedInfrastructureId
): boolean {
  return resolveProductDefinition(productId)?.consumesInfrastructure.includes(infra) ?? false;
}

export const BILLING_PRODUCT_PLANS: BillingProductPlan[] = [
  {
    id: "editor",
    labelKey: "suite.billing.plan.editor",
    includesProducts: ["editor", "assets"],
  },
  {
    id: "studio",
    labelKey: "suite.billing.plan.studio",
    includesProducts: ["studio", "assets"],
  },
  {
    id: "motion",
    labelKey: "suite.billing.plan.motion",
    includesProducts: ["motion", "assets"],
  },
  {
    id: "publish",
    labelKey: "suite.billing.plan.publish",
    includesProducts: ["presentation"],
  },
  {
    id: "complete_suite",
    labelKey: "suite.billing.plan.completeSuite",
    includesProducts: ["editor", "studio", "motion", "presentation", "assets"],
  },
];

export type SuiteAuditRow = {
  product: HomeCheffProductId;
  stored: string[];
  consumed: string[];
  behaviorImpact: string;
  ownership: string;
  permissions: string;
};

export const SUITE_END_TO_END_AUDIT: SuiteAuditRow[] = [
  {
    product: "editor",
    stored: ["StudioAsset registry", "AssetSemanticRecord", "VisualEditorSession (future)", "referencePlacements"],
    consumed: ["Vision analysis", "Object detection", "Composition graph", "Identity profiles"],
    behaviorImpact: "Produces prepared assets for Studio/Motion",
    ownership: "User-owned assets in blob + semantic marker",
    permissions: "Owner + admin lifecycle rules",
  },
  {
    product: "studio",
    stored: ["Storyboards", "Scene snapshots", "SceneSemanticRecipe", "Director proposals"],
    consumed: ["Characters", "Props", "Locations", "Worlds", "Assets registry", "Motion handoff payload"],
    behaviorImpact: "Produces scene recipes and motion handoff",
    ownership: "User-owned studio entities",
    permissions: "Owner-scoped CRUD + story usage",
  },
  {
    product: "motion",
    stored: ["Animation projects", "Transitions", "Motion handoff execution", "Render traces"],
    consumed: ["Single images", "Image sequences", "Scene recipes", "Placement continuity"],
    behaviorImpact: "Produces video output",
    ownership: "User-owned animation projects",
    permissions: "Owner + billing credits",
  },
  {
    product: "presentation",
    stored: ["Deliverables metadata", "Subtitle tracks", "Overlay configs", "Brand kits (future)"],
    consumed: ["Uploaded MP4", "Motion video output", "Safe area presets"],
    behaviorImpact: "Publish product — produces final deliverables (standalone, no Studio required)",
    ownership: "User-owned videos + export artifacts",
    permissions: "Owner-scoped; upload allowed without Studio",
  },
  {
    product: "assets",
    stored: ["Media", "Creative", "Library subdivisions", "Semantic continuity"],
    consumed: ["All products read/write via registry"],
    behaviorImpact: "Library product — central hub; placement sources protected from hard delete",
    ownership: "User uploads + generated + derived",
    permissions: "Lifecycle eligibility + used-in tracking",
  },
];
