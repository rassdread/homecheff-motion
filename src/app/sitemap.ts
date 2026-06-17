import type { MetadataRoute } from "next";
import { absoluteUrl, SEO_PUBLIC_PATHS } from "@/lib/seo/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return SEO_PUBLIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority:
      path === "/"
        ? 1
        : path === "/pricing" || path === "/studio" || path === "/animate/instant"
          ? 0.9
          : path.startsWith("/help/")
            ? 0.6
            : 0.7,
  }));
}
