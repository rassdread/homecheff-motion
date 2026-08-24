/**
 * SEO 0 — Studio programmatic URL classification counts.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HELP_ARTICLES } from "@/lib/help-center";
import { SEO_CONTENT_PATHS } from "@/lib/seo/seo-content-paths";
import {
  SEO_APP_TOOL_PATHS,
  SEO_NOINDEX_PATH_PREFIXES,
  SEO_SITEMAP_PATHS,
} from "@/lib/seo/site-metadata";
import { PUBLIC_PAGE_SEO } from "@/lib/seo/public-pages";

type UrlClass =
  | "INDEX"
  | "NOINDEX"
  | "REMOVE_FROM_SITEMAP"
  | "AUTH_PRIVATE"
  | "NEEDS_CONTENT_REVIEW";

const AUTH_PRIVATE_PREFIXES = [
  "/account",
  "/admin",
  "/mijn-verbruik",
  "/auth",
  "/onboarding",
] as const;

function classifyPath(path: string): UrlClass {
  if (SEO_SITEMAP_PATHS.includes(path as (typeof SEO_SITEMAP_PATHS)[number])) {
    return "INDEX";
  }
  if (SEO_APP_TOOL_PATHS.includes(path as (typeof SEO_APP_TOOL_PATHS)[number])) {
    return "NOINDEX";
  }
  if (SEO_NOINDEX_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return "NOINDEX";
  }
  if (AUTH_PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return "AUTH_PRIVATE";
  }
  if (path.startsWith("/studio/") && path !== PUBLIC_PAGE_SEO.studio.path) {
    return "NEEDS_CONTENT_REVIEW";
  }
  if (path.startsWith("/drafts") || path.startsWith("/billing")) {
    return "AUTH_PRIVATE";
  }
  return "REMOVE_FROM_SITEMAP";
}

/** All known Studio marketing/programmatic paths for SEO 0 inventory. */
function allKnownStudioPaths(): string[] {
  const core = [
    PUBLIC_PAGE_SEO.home.path,
    PUBLIC_PAGE_SEO.pricing.path,
    PUBLIC_PAGE_SEO.help.path,
    PUBLIC_PAGE_SEO.studio.path,
    PUBLIC_PAGE_SEO.motion.path,
    PUBLIC_PAGE_SEO.editor.path,
    PUBLIC_PAGE_SEO.library.path,
    PUBLIC_PAGE_SEO.projects.path,
    PUBLIC_PAGE_SEO.signup.path,
    "/account",
    "/admin",
    "/billing",
    "/auth/login",
    "/onboarding",
    "/drafts",
  ];
  const help = HELP_ARTICLES.map((a) => `/help/${a.slug}`);
  return [...new Set([...core, ...help, ...SEO_CONTENT_PATHS])];
}

describe("SEO 0 Studio sitemap classification", () => {
  it("app/tool routes are excluded from sitemap and classified NOINDEX", () => {
    for (const path of SEO_APP_TOOL_PATHS) {
      assert.equal(classifyPath(path), "NOINDEX");
      assert.ok(!SEO_SITEMAP_PATHS.includes(path as (typeof SEO_SITEMAP_PATHS)[number]), path);
    }
  });

  it("sitemap paths are INDEX only (no private app routes)", () => {
    for (const path of SEO_SITEMAP_PATHS) {
      assert.equal(classifyPath(path), "INDEX", path);
      assert.ok(!SEO_APP_TOOL_PATHS.includes(path as (typeof SEO_APP_TOOL_PATHS)[number]), path);
    }
  });

  it("reports classification counts for known Studio URL inventory", () => {
    const counts: Record<UrlClass, number> = {
      INDEX: 0,
      NOINDEX: 0,
      REMOVE_FROM_SITEMAP: 0,
      AUTH_PRIVATE: 0,
      NEEDS_CONTENT_REVIEW: 0,
    };
    for (const path of allKnownStudioPaths()) {
      counts[classifyPath(path)] += 1;
    }
    assert.ok(counts.INDEX > 0);
    assert.ok(counts.NOINDEX >= SEO_APP_TOOL_PATHS.length);
    assert.equal(counts.INDEX, SEO_SITEMAP_PATHS.length);
  });
});
