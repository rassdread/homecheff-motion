import { HOMECHEFF_BRAND_ICON_PATHS } from "@/lib/homecheff-brand-icon";
import { serveHomeCheffBrandPng } from "@/lib/serve-homecheff-brand-png";

/** Versioned PNG — Safari caches /apple-touch-icon.png per site; avoid stale static file. */
export function GET() {
  return serveHomeCheffBrandPng(HOMECHEFF_BRAND_ICON_PATHS.appleTouchIcon);
}
