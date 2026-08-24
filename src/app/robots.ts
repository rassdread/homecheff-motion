import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/account/", "/mijn-verbruik/", "/editor/", "/library/", "/projects/", "/signup/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
