import type { MetadataRoute } from "next";
import { absoluteUrl, SEO_PUBLIC_PATHS } from "@/lib/seo/site-metadata";

function priorityForPath(path: string): number {
  if (path === "/") return 1;
  if (path === "/pricing" || path === "/studio" || path === "/animate/instant") return 0.9;
  if (path.startsWith("/alternatives/") || path.startsWith("/guides/")) return 0.75;
  if (path.startsWith("/workflows/")) return 0.72;
  if (path === "/alternatives" || path === "/guides" || path === "/workflows") return 0.78;
  if (path.startsWith("/help/")) return 0.6;
  return 0.7;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return SEO_PUBLIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: priorityForPath(path),
  }));
}
