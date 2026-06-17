import type { Metadata } from "next";
import { HOMECHEFF_BRAND_ICON_ASSET_VERSION } from "@/lib/homecheff-brand-icon-version";

/** SSOT raster source — all favicon/touch assets are generated from this file. */
export const HOMECHEFF_BRAND_ICON_SOURCE = "/homecheff-globe-man.png" as const;

/** Primary metadata/manifest icon paths (unique filenames — real cache bust). */
export const HOMECHEFF_BRAND_ICON_PATHS = {
  source: HOMECHEFF_BRAND_ICON_SOURCE,
  faviconIco: `/homecheff-favicon-${HOMECHEFF_BRAND_ICON_ASSET_VERSION}.ico`,
  favicon16: `/homecheff-favicon-16-${HOMECHEFF_BRAND_ICON_ASSET_VERSION}.png`,
  favicon32: `/homecheff-favicon-32-${HOMECHEFF_BRAND_ICON_ASSET_VERSION}.png`,
  appleTouchIcon: `/homecheff-apple-touch-icon-${HOMECHEFF_BRAND_ICON_ASSET_VERSION}.png`,
  /** Legacy root fallback only — not listed first in metadata. */
  legacyFaviconIco: "/favicon.ico",
  webManifest: "/site.webmanifest",
} as const;

export const HOMECHEFF_BRAND_ICON_ALT = "HomeCheff";

/**
 * Metadata icons — PNG first (Chrome/Safari), then v4 ICO, then legacy /favicon.ico fallback.
 */
export function homeCheffSiteIcons(): NonNullable<Metadata["icons"]> {
  return {
    icon: [
      {
        url: HOMECHEFF_BRAND_ICON_PATHS.favicon32,
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: HOMECHEFF_BRAND_ICON_PATHS.favicon16,
        sizes: "16x16",
        type: "image/png",
      },
      { url: HOMECHEFF_BRAND_ICON_PATHS.faviconIco, sizes: "any" },
      { url: HOMECHEFF_BRAND_ICON_PATHS.legacyFaviconIco, sizes: "any" },
    ],
    apple: [
      {
        url: HOMECHEFF_BRAND_ICON_PATHS.appleTouchIcon,
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: HOMECHEFF_BRAND_ICON_PATHS.faviconIco,
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
      src: HOMECHEFF_BRAND_ICON_PATHS.favicon16,
      sizes: "16x16",
      type: "image/png",
    },
    {
      src: HOMECHEFF_BRAND_ICON_PATHS.favicon32,
      sizes: "32x32",
      type: "image/png",
    },
    {
      src: HOMECHEFF_BRAND_ICON_PATHS.appleTouchIcon,
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
