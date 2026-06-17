import type { Metadata } from "next";
import {
  homeCheffOpenGraphIcon,
  homeCheffSiteIcons,
  HOMECHEFF_BRAND_ICON_PATHS,
} from "@/lib/homecheff-brand-icon";
import { getCanonicalStudioOrigin } from "@/lib/public-origin";

const SITE_NAME = "HomeCheff Studio";
const DEFAULT_DESCRIPTION =
  "Your AI production line — create once, adapt endlessly. Build assets in Editor, design in Studio, animate in Motion, and publish unlimited versions.";

export function absoluteUrl(path: string): string {
  const vercelUrl = process.env.VERCEL_URL?.trim();
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_STUDIO_URL?.replace(/\/$/, "") ??
    (vercelUrl
      ? `https://${vercelUrl.replace(/^https?:\/\//, "")}`
      : getCanonicalStudioOrigin());
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  locale?: "en" | "nl";
}): Metadata {
  const url = absoluteUrl(input.path);
  const ogImageUrl = absoluteUrl(HOMECHEFF_BRAND_ICON_PATHS.primary);
  return {
    title: `${input.title} | ${SITE_NAME}`,
    description: input.description,
    alternates: { canonical: url },
    icons: homeCheffSiteIcons(),
    manifest: HOMECHEFF_BRAND_ICON_PATHS.webManifest,
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: input.locale === "nl" ? "nl_NL" : "en_US",
      images: homeCheffOpenGraphIcon(ogImageUrl),
    },
    twitter: {
      card: "summary",
      title: input.title,
      description: input.description,
      images: [ogImageUrl],
    },
  };
}

export const ROOT_SITE_METADATA: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  icons: homeCheffSiteIcons(),
  manifest: HOMECHEFF_BRAND_ICON_PATHS.webManifest,
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    type: "website",
    images: homeCheffOpenGraphIcon(absoluteUrl(HOMECHEFF_BRAND_ICON_PATHS.primary)),
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    images: [absoluteUrl(HOMECHEFF_BRAND_ICON_PATHS.primary)],
  },
};

export const DEFAULT_SITE_METADATA: Metadata = buildPageMetadata({
  title: SITE_NAME,
  description: DEFAULT_DESCRIPTION,
  path: "/",
});

export function buildArticleJsonLd(input: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };
}

export const SEO_PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/help",
  "/studio",
  "/animate/instant",
  "/help/what-are-studio-credits",
  "/help/how-subscriptions-work",
  "/help/do-credits-expire",
  "/help/what-happens-when-i-cancel",
  "/help/how-much-do-studio-actions-cost",
  "/help/how-motion-pricing-works",
  "/help/how-campaign-codes-work",
  "/help/credits-vs-subscriptions",
  "/help/getting-started-with-studio",
] as const;
