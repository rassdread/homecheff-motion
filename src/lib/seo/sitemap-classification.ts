import { SEO_APP_TOOL_PATHS, SEO_SITEMAP_PATHS } from "@/lib/seo/site-metadata";
import { SEO_CONTENT_PATHS } from "@/lib/seo/seo-content-paths";
import { HELP_ARTICLES } from "@/lib/help-center";
import { PUBLIC_PAGE_SEO } from "@/lib/seo/public-pages";

/** SEO 0 route classification counts for Product Owner review. */
export const SEO_SITEMAP_CLASSIFICATION = {
  INDEX: SEO_SITEMAP_PATHS.length,
  REMOVE_FROM_SITEMAP: SEO_APP_TOOL_PATHS.length,
  NOINDEX_APP_TOOL: SEO_APP_TOOL_PATHS.length,
  AUTH_PRIVATE: ["/account", "/admin", "/mijn-verbruik", "/api"] as const,
  NEEDS_CONTENT_REVIEW: SEO_CONTENT_PATHS.length,
} as const;

export const SEO_SITEMAP_CLASSIFICATION_DETAIL = {
  indexMarketingCore: [
    PUBLIC_PAGE_SEO.home.path,
    PUBLIC_PAGE_SEO.pricing.path,
    PUBLIC_PAGE_SEO.help.path,
    PUBLIC_PAGE_SEO.studio.path,
    PUBLIC_PAGE_SEO.motion.path,
  ],
  indexHelpArticles: HELP_ARTICLES.length,
  indexProgrammaticContent: SEO_CONTENT_PATHS.length,
  removedAppTools: [...SEO_APP_TOOL_PATHS],
} as const;
