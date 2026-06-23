import { HOMECHEFF_BRAND_ICON_PATHS } from "@/lib/homecheff-brand-icon";
import { serveHomeCheffBrandPng } from "@/lib/serve-homecheff-brand-png";

/** Safari blind-fetches /favicon.ico before HTML — must be image/png, not image/x-icon. */
export function GET() {
  return serveHomeCheffBrandPng(HOMECHEFF_BRAND_ICON_PATHS.favicon32);
}
