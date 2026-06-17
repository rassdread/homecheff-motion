import type { ShowcasePageKey } from "@/types/studio-showcase-item";
import type { StudioProductLandingModuleKey } from "@/lib/studio-product-landing-config";

export function landingModuleKeyToShowcasePageKey(
  moduleKey: StudioProductLandingModuleKey
): ShowcasePageKey {
  switch (moduleKey) {
    case "studio":
      return "studio";
    case "editor":
      return "editor";
    case "motion":
      return "motion";
    case "publish":
      return "publish";
    case "library":
    case "usage":
      return "library";
    default:
      return "home";
  }
}

export const SHOWCASE_ADMIN_SECTIONS: ShowcasePageKey[] = [
  "home",
  "studio",
  "motion",
  "editor",
  "publish",
  "library",
  "global",
];
