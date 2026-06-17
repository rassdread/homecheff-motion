import type { Metadata } from "next";
import { HOMECHEFF_BRAND_ICON_CACHE_VERSION } from "@/lib/homecheff-brand-icon-version";

/** SSOT raster source — all favicon/touch assets are generated from this file. */
export const HOMECHEFF_BRAND_ICON_SOURCE = "/homecheff-globe-man.png" as const;

/** Derived public assets (npm run generate:brand-icons). */
export const HOMECHEFF_BRAND_ICON_PATHS = {
  source: HOMECHEFF_BRAND_ICON_SOURCE,
  faviconIco: "/favicon.ico",
  favicon16: "/favicon-16x16.png",
  favicon32: "/favicon-32x32.png",
  appleTouchIcon: "/apple-touch-icon.png",
  webManifest: "/site.webmanifest",
} as const;

export const HOMECHEFF_BRAND_ICON_ALT = "HomeCheff";

/** Cache-busted URL for metadata / manifest icon links. */
export function homeCheffBrandIconUrl(
  path: string,
  version: number = HOMECHEFF_BRAND_ICON_CACHE_VERSION
): string {
  return `${path}?v=${version}`;
}

/**
 * Single metadata icon configuration — no app/favicon.ico, no duplicate head links.
 * Order: ICO first (Safari/Firefox), then PNG sizes, then apple-touch.
 */
export function homeCheffSiteIcons(): NonNullable<Metadata["icons"]> {
  const faviconIco = homeCheffBrandIconUrl(HOMECHEFF_BRAND_ICON_PATHS.faviconIco);
  const favicon32 = homeCheffBrandIconUrl(HOMECHEFF_BRAND_ICON_PATHS.favicon32);
  const favicon16 = homeCheffBrandIconUrl(HOMECHEFF_BRAND_ICON_PATHS.favicon16);
  const appleTouch = homeCheffBrandIconUrl(HOMECHEFF_BRAND_ICON_PATHS.appleTouchIcon);

  return {
    icon: [
      { url: faviconIco, sizes: "any" },
      { url: favicon32, sizes: "32x32", type: "image/png" },
      { url: favicon16, sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: appleTouch, sizes: "180x180", type: "image/png" }],
    shortcut: faviconIco,
  };
}

export function homeCheffWebManifestIcons(): Array<{
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}> {
  return [
    {
      src: homeCheffBrandIconUrl(HOMECHEFF_BRAND_ICON_PATHS.favicon16),
      sizes: "16x16",
      type: "image/png",
    },
    {
      src: homeCheffBrandIconUrl(HOMECHEFF_BRAND_ICON_PATHS.favicon32),
      sizes: "32x32",
      type: "image/png",
    },
    {
      src: homeCheffBrandIconUrl(HOMECHEFF_BRAND_ICON_PATHS.appleTouchIcon),
      sizes: "180x180",
      type: "image/png",
    },
    {
      src: HOMECHEFF_BRAND_ICON_PATHS.source,
      sizes: "1254x1254",
      type: "image/png",
      purpose: "any",
    },
  ];
}

export function homeCheffOpenGraphIcon(url: string): NonNullable<Metadata["openGraph"]>["images"] {
  return [
    {
      url,
      width: 1254,
      height: 1254,
      alt: HOMECHEFF_BRAND_ICON_ALT,
    },
  ];
}
