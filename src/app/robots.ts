import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site-metadata";

const DISALLOW = [
  "/admin/",
  "/api/",
  "/account/",
  "/mijn-verbruik/",
  "/editor/",
  "/library/",
  "/projects/",
  "/signup/",
] as const;

/** AI / search discovery crawlers verified as relevant for GEO/AEO — do not invent names. */
const AI_SEARCH_USER_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Google-Extended",
  "PerplexityBot",
  "Applebot-Extended",
] as const;

function crawlRule(userAgent: string): {
  userAgent: string;
  allow: string;
  disallow: string[];
} {
  return {
    userAgent,
    allow: "/",
    disallow: [...DISALLOW],
  };
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [crawlRule("*"), ...AI_SEARCH_USER_AGENTS.map(crawlRule)],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
