import type { MetadataRoute } from "next";
import { HELP_ARTICLES } from "@/lib/help-center";
import { absoluteUrl, SEO_PUBLIC_PATHS } from "@/lib/seo/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPaths = SEO_PUBLIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : path === "/pricing" ? 0.9 : 0.7,
  }));

  const articlePaths = HELP_ARTICLES.map((article) => ({
    url: absoluteUrl(`/help/${article.slug}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const seen = new Set<string>();
  return [...staticPaths, ...articlePaths].filter((row) => {
    if (seen.has(row.url)) return false;
    seen.add(row.url);
    return true;
  });
}
