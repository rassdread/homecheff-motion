import type { Metadata } from "next";

/** Bump when favicon assets change to bust Safari/browser icon caches. */
export const HOMECHEFF_BRAND_ICON_CACHE_VERSION = 2;

/** Official HomeCheff globe-man brand asset paths (public/). */
export const HOMECHEFF_BRAND_ICON_PATHS = {
  primary: "/homecheff-globe-man.png",
  faviconIco: "/favicon.ico",
  favicon16: "/favicon-16x16.png",
  favicon32: "/favicon-32x32.png",
  faviconSvg: "/favicon.svg",
  appleTouchIcon: "/apple-touch-icon.png",
  webManifest: "/site.webmanifest",
} as const;

export const HOMECHEFF_BRAND_ICON_ALT = "HomeCheff";

/** Cache-busted URL for metadata / Safari icon links. */
export function homeCheffBrandIconUrl(
  path: string,
  version: number = HOMECHEFF_BRAND_ICON_CACHE_VERSION
): string {
  return `${path}?v=${version}`;
}

/** Explicit Safari-critical icon hrefs (also emitted via metadata icons). */
export const HOMECHEFF_SAFARI_ICON_URLS = {
  faviconIco: homeCheffBrandIconUrl(HOMECHEFF_BRAND_ICON_PATHS.faviconIco),
  favicon32: homeCheffBrandIconUrl(HOMECHEFF_BRAND_ICON_PATHS.favicon32),
  appleTouchIcon: homeCheffBrandIconUrl(HOMECHEFF_BRAND_ICON_PATHS.appleTouchIcon),
} as const;

export function homeCheffSiteIcons(): NonNullable<Metadata["icons"]> {
  return {
    icon: [
      { url: HOMECHEFF_BRAND_ICON_PATHS.faviconSvg, type: "image/svg+xml" },
      {
        url: HOMECHEFF_SAFARI_ICON_URLS.favicon32,
        sizes: "32x32",
        type: "image/png",
      },
      { url: HOMECHEFF_BRAND_ICON_PATHS.favicon16, sizes: "16x16", type: "image/png" },
      { url: HOMECHEFF_SAFARI_ICON_URLS.faviconIco, sizes: "any" },
    ],
    apple: [
      {
        url: HOMECHEFF_SAFARI_ICON_URLS.appleTouchIcon,
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: HOMECHEFF_SAFARI_ICON_URLS.faviconIco,
  };
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
