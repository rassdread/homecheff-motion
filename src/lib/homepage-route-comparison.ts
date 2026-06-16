/**
 * Homepage route comparison — `/` is canonical; `/maak` is a legacy redirect alias.
 */

import { isHomeCheffAssistantRoute } from "@/lib/homecheff-assistant-flag";

export const CANONICAL_HOMEPAGE_PATH = "/" as const;
export const LEGACY_HOMEPAGE_ALIAS_PATH = "/maak" as const;

export type HomepageRouteFeatureRow = {
  feature: string;
  root: boolean | "redirect";
  maak: boolean | "redirect";
};

/** Feature matrix before consolidation (historical). `/maak` lacked Growth Sidebar shell. */
export const HOMEPAGE_ROUTE_FEATURE_COMPARISON: HomepageRouteFeatureRow[] = [
  { feature: "Growth Sidebar", root: true, maak: false },
  { feature: "Universe", root: true, maak: true },
  { feature: "Space Carousel", root: true, maak: true },
  { feature: "Recent Projects", root: true, maak: true },
  { feature: "Recent Assets", root: true, maak: true },
  { feature: "Capabilities", root: true, maak: true },
  { feature: "Why Studio / Production line", root: true, maak: false },
  { feature: "Getting Started", root: true, maak: false },
  { feature: "Document Scroll (with sidebar)", root: true, maak: true },
  { feature: "Assistant shell", root: true, maak: false },
  { feature: "Logged-out content", root: true, maak: true },
  { feature: "Logged-in content", root: true, maak: true },
];

export function maakRouteUsesAssistantShell(): boolean {
  return isHomeCheffAssistantRoute(LEGACY_HOMEPAGE_ALIAS_PATH);
}
