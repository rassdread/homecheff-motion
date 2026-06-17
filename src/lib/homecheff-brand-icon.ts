import type { Metadata } from "next";

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

export function homeCheffSiteIcons(): NonNullable<Metadata["icons"]> {
  return {
    icon: [
      { url: HOMECHEFF_BRAND_ICON_PATHS.faviconSvg, type: "image/svg+xml" },
      { url: HOMECHEFF_BRAND_ICON_PATHS.favicon32, sizes: "32x32", type: "image/png" },
      { url: HOMECHEFF_BRAND_ICON_PATHS.favicon16, sizes: "16x16", type: "image/png" },
      { url: HOMECHEFF_BRAND_ICON_PATHS.faviconIco, sizes: "any" },
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
