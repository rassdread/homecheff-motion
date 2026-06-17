import type { Metadata } from "next";

const SITE_NAME = "HomeCheff Studio";
const DEFAULT_DESCRIPTION =
  "Your AI production line — create once, adapt endlessly. Build assets in Editor, design in Studio, animate in Motion, and publish unlimited versions.";

export function absoluteUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.VERCEL_URL ?
      `https://${process.env.VERCEL_URL}`
    : "https://studio.homecheff.eu";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  locale?: "en" | "nl";
}): Metadata {
  const url = absoluteUrl(input.path);
  return {
    title: `${input.title} | ${SITE_NAME}`,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: input.locale === "nl" ? "nl_NL" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
  };
}

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
