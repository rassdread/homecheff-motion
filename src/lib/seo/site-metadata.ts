import type { Metadata } from "next";
import {
  homeCheffOpenGraphIcon,
  homeCheffSiteIcons,
  HOMECHEFF_BRAND_ICON_PATHS,
} from "@/lib/homecheff-brand-icon";
import { getCanonicalStudioOrigin } from "@/lib/public-origin";
import { HELP_ARTICLES } from "@/lib/help-center";
import { PUBLIC_PAGE_SEO } from "@/lib/seo/public-pages";
import { SEO_CONTENT_PATHS } from "@/lib/seo/seo-content-paths";

const SITE_NAME = "HomeCheff Studio";
const DEFAULT_DESCRIPTION = PUBLIC_PAGE_SEO.home.description;

/** Routes that should not appear in search indexes. */
export const SEO_NOINDEX_PATH_PREFIXES = [
  "/account",
  "/admin",
  "/mijn-verbruik",
  "/editor",
  "/library",
  "/projects",
  "/signup",
] as const;

/** Application/tool surfaces — excluded from sitemap, noindex via layout metadata. */
export const SEO_APP_TOOL_PATHS = [
  PUBLIC_PAGE_SEO.editor.path,
  PUBLIC_PAGE_SEO.library.path,
  PUBLIC_PAGE_SEO.projects.path,
  PUBLIC_PAGE_SEO.signup.path,
] as const;

export function buildNoIndexMetadata(): Metadata {
  return {
    robots: {
      index: false,
      follow: false,
    },
  };
}

/** Authenticated app/tool routes: exclude from index, allow follow for exit links. */
export function buildAppToolNoIndexMetadata(): Metadata {
  return {
    robots: {
      index: false,
      follow: true,
    },
  };
}

/** Request origin for metadata in dev — not production NEXT_PUBLIC_APP_URL. */
export function getMetadataBaseUrl(): string {
  if (process.env.NODE_ENV === "development") {
    const port = process.env.PORT ?? "3000";
    return `http://localhost:${port}`;
  }
  return absoluteUrl("/").replace(/\/$/, "");
}

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
  const ogImageUrl = absoluteUrl(HOMECHEFF_BRAND_ICON_PATHS.source);
  const locale = input.locale ?? "en";
  const languages: Record<string, string> = {
    "x-default": url,
  };
  if (locale === "nl") {
    languages["nl-NL"] = url;
    languages.en = absoluteUrl("/guides");
  } else {
    languages.en = url;
  }

  return {
    title: `${input.title} | ${SITE_NAME}`,
    description: input.description,
    alternates: { canonical: url, languages },
    icons: homeCheffSiteIcons(),
    manifest: HOMECHEFF_BRAND_ICON_PATHS.webManifest,
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: locale === "nl" ? "nl_NL" : "en_US",
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
  metadataBase: new URL(`${getMetadataBaseUrl()}/`),
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
    images: homeCheffOpenGraphIcon(absoluteUrl(HOMECHEFF_BRAND_ICON_PATHS.source)),
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    images: [absoluteUrl(HOMECHEFF_BRAND_ICON_PATHS.source)],
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
    image: absoluteUrl(HOMECHEFF_BRAND_ICON_PATHS.source),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(HOMECHEFF_BRAND_ICON_PATHS.source),
      },
    },
  };
}

const HELP_SITEMAP_PATHS = HELP_ARTICLES.map((article) => `/help/${article.slug}` as const);

/** Marketing + help + programmatic content hubs included in XML sitemap. */
export const SEO_SITEMAP_PATHS = [
  PUBLIC_PAGE_SEO.home.path,
  PUBLIC_PAGE_SEO.pricing.path,
  PUBLIC_PAGE_SEO.help.path,
  PUBLIC_PAGE_SEO.studio.path,
  PUBLIC_PAGE_SEO.motion.path,
  ...HELP_SITEMAP_PATHS,
  ...SEO_CONTENT_PATHS,
] as const;

/** Legacy alias — sitemap generation uses SEO_SITEMAP_PATHS only. */
export const SEO_PUBLIC_PATHS = SEO_SITEMAP_PATHS;
