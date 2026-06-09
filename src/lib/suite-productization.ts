import {
  HOMECHEFF_PRODUCT_IDS,
  resolveProductDefinition,
  resolveProductHref,
} from "@/lib/homecheff-product-suite";
import { isHomeCheffProductSuiteNavEnabled } from "@/lib/homecheff-product-suite-flag";
import type { HomeCheffProductId } from "@/types/homecheff-product-suite";

export const SUITE_MODULE_IDS = [...HOMECHEFF_PRODUCT_IDS, "suite"] as const;
export type SuiteModuleId = (typeof SUITE_MODULE_IDS)[number];

export type SuiteFeatureFlag = {
  id: string;
  enabled: boolean;
  moduleId: SuiteModuleId;
};

export type SuiteUsageCategory = "editor_sessions" | "studio_scenes" | "motion_renders" | "publish_exports" | "library_assets";

export const SUITE_USAGE_CATEGORIES: SuiteUsageCategory[] = [
  "editor_sessions",
  "studio_scenes",
  "motion_renders",
  "publish_exports",
  "library_assets",
];

export function resolveModuleForPath(pathname: string): HomeCheffProductId | "suite" | null {
  if (pathname === "/" || pathname === "/maak") {
    return "suite";
  }
  for (const id of HOMECHEFF_PRODUCT_IDS) {
    const def = resolveProductDefinition(id);
    if (!def) {
      continue;
    }
    const href = resolveProductHref(id);
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      return id;
    }
    if (id === "presentation" && (pathname.startsWith("/videos") || pathname.startsWith("/publish"))) {
      return id;
    }
    if (id === "assets" && (pathname.startsWith("/studio/assets") || pathname.startsWith("/library"))) {
      return id;
    }
  }
  return null;
}

export function isModuleAccessible(moduleId: SuiteModuleId): boolean {
  if (moduleId === "suite") {
    return true;
  }
  return Boolean(resolveProductDefinition(moduleId));
}

export function resolveSuiteFeatureFlags(): SuiteFeatureFlag[] {
  const suiteNav = isHomeCheffProductSuiteNavEnabled();
  return [
    { id: "suite_nav", enabled: suiteNav, moduleId: "suite" },
    { id: "editor_body_designer", enabled: true, moduleId: "editor" },
    { id: "publish_overlay_timeline", enabled: true, moduleId: "presentation" },
    { id: "professional_qa_layer", enabled: true, moduleId: "suite" },
    { id: "billing_enforcement", enabled: false, moduleId: "suite" },
  ];
}

export function resolvePlanLabelKey(planId: string): string {
  return `suite.billing.plan.${planId === "complete_suite" ? "completeSuite" : planId}`;
}

export function isNavVisibleForModule(moduleId: HomeCheffProductId, suiteNavEnabled: boolean): boolean {
  if (!suiteNavEnabled) {
    return moduleId !== "editor";
  }
  return true;
}
