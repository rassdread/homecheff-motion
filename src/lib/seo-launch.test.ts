import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { HELP_ARTICLES } from "@/lib/help-center";
import { PUBLIC_PAGE_SEO } from "@/lib/seo/public-pages";
import {
  buildFaqPageJsonLd,
  buildOrganizationJsonLd,
  buildPricingProductJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
  PRICING_FAQ_SCHEMA,
} from "@/lib/seo/structured-data";
import { SEO_NOINDEX_PATH_PREFIXES, SEO_PUBLIC_PATHS, buildPageMetadata } from "@/lib/seo/site-metadata";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("SEO launch readiness", () => {
  it("public pages include core marketing routes and all help articles", () => {
    for (const path of [
      "/",
      "/studio",
      "/editor",
      "/animate/instant",
      "/pricing",
      "/help",
      "/library",
      "/projects",
      "/signup",
    ]) {
      assert.ok(SEO_PUBLIC_PATHS.includes(path as (typeof SEO_PUBLIC_PATHS)[number]), path);
    }
    for (const article of HELP_ARTICLES) {
      const path = `/help/${article.slug}`;
      assert.ok(SEO_PUBLIC_PATHS.includes(path as (typeof SEO_PUBLIC_PATHS)[number]), path);
    }
  });

  it("root layout injects Organization, WebSite, and SoftwareApplication JSON-LD", () => {
    const layout = read("src/app/layout.tsx");
    assert.match(layout, /buildOrganizationJsonLd/);
    assert.match(layout, /buildWebSiteJsonLd/);
    assert.match(layout, /buildSoftwareApplicationJsonLd/);
    assert.match(layout, /<JsonLd/);
  });

  it("pricing layout includes Product and FAQPage schema", () => {
    const pricing = read("src/app/pricing/layout.tsx");
    assert.match(pricing, /buildPricingProductJsonLd/);
    assert.match(pricing, /buildFaqPageJsonLd/);
    assert.match(pricing, /CommercialSeoEnrichment/);
    const faq = buildFaqPageJsonLd(PRICING_FAQ_SCHEMA);
    assert.equal(faq["@type"], "FAQPage");
    assert.ok(faq.mainEntity.length >= 5);
  });

  it("studio and motion layouts include enhanced SoftwareApplication schema", () => {
    assert.match(read("src/app/studio/layout.tsx"), /buildSoftwareApplicationJsonLd/);
    assert.match(read("src/app/animate/instant/layout.tsx"), /buildMotionVideoObjectJsonLd/);
    assert.match(read("src/app/animate/instant/layout.tsx"), /buildSoftwareApplicationJsonLd/);
  });

  it("buildPageMetadata includes hreflang alternates", () => {
    const en = buildPageMetadata({
      title: "Test",
      description: "Test description for EN page.",
      path: "/guides/how-to-create-marketing-videos",
      locale: "en",
    });
    assert.ok(en.alternates?.languages?.en);
    assert.ok(en.alternates?.languages?.["x-default"]);

    const nl = buildPageMetadata({
      title: "Test NL",
      description: "Test beschrijving voor NL pagina.",
      path: "/guides/van-verhaal-naar-video",
      locale: "nl",
    });
    assert.ok(nl.alternates?.languages?.["nl-NL"]);
    assert.ok(nl.alternates?.languages?.en);
  });

  it("motion marketing URL consolidates to /animate/instant", () => {
    const motion = read("src/app/motion/page.tsx");
    assert.match(motion, /permanentRedirect\("\/animate\/instant"\)/);
  });

  it("help articles use breadcrumb + article structured data", () => {
    const page = read("src/app/help/[slug]/page.tsx");
    assert.match(page, /buildHelpArticleJsonLd/);
    assert.doesNotMatch(page, /buildArticleJsonLd/);
  });

  it("private areas export noindex metadata", () => {
    for (const file of [
      "src/app/account/layout.tsx",
      "src/app/admin/layout.tsx",
      "src/app/mijn-verbruik/layout.tsx",
    ]) {
      const source = read(file);
      assert.match(source, /buildNoIndexMetadata/);
    }
    assert.deepEqual(SEO_NOINDEX_PATH_PREFIXES, ["/account", "/admin", "/mijn-verbruik"]);
  });

  it("robots disallows private prefixes and references sitemap", () => {
    const robots = read("src/app/robots.ts");
    assert.match(robots, /allow:\s*"\//);
    assert.match(robots, /\/account\//);
    assert.match(robots, /\/admin\//);
    assert.match(robots, /\/mijn-verbruik\//);
    assert.match(robots, /sitemap/);
  });

  it("sitemap is driven by SEO_PUBLIC_PATHS only", () => {
    const sitemap = read("src/app/sitemap.ts");
    assert.match(sitemap, /SEO_PUBLIC_PATHS/);
    assert.doesNotMatch(sitemap, /HELP_ARTICLES/);
  });

  it("major public routes have dedicated metadata layouts", () => {
    for (const layout of [
      "src/app/editor/layout.tsx",
      "src/app/library/layout.tsx",
      "src/app/projects/layout.tsx",
      "src/app/studio/layout.tsx",
      "src/app/animate/instant/layout.tsx",
      "src/app/pricing/layout.tsx",
      "src/app/signup/layout.tsx",
    ]) {
      const source = read(layout);
      assert.match(source, /PUBLIC_PAGE_SEO/);
      assert.match(source, /buildPageMetadata/);
    }
  });

  it("buildPageMetadata includes canonical, Open Graph, and Twitter images", () => {
    const meta = buildPageMetadata({
      title: PUBLIC_PAGE_SEO.motion.title,
      description: PUBLIC_PAGE_SEO.motion.description,
      path: PUBLIC_PAGE_SEO.motion.path,
    });
    assert.ok(meta.alternates?.canonical);
    assert.ok(meta.openGraph?.images?.length);
    assert.ok(meta.twitter?.images?.length);
  });

  it("structured data builders produce valid schema types", () => {
    assert.equal(buildOrganizationJsonLd()["@type"], "Organization");
    assert.equal(buildWebSiteJsonLd()["@type"], "WebSite");
    assert.equal(buildSoftwareApplicationJsonLd()["@type"], "SoftwareApplication");
    assert.equal(buildPricingProductJsonLd()["@type"], "Product");
    assert.ok(buildSoftwareApplicationJsonLd({ featureList: ["Test"] }).featureList?.length);
  });

  it("help center cross-links product hubs and related articles", () => {
    const help = read("src/components/help/help-center-pages.tsx");
    assert.match(help, /PRODUCT_HUB_LINKS/);
    assert.match(help, /relatedArticles/);
    assert.match(help, /help\.article\.related/);
  });

  it("SEO audit documentation exists", () => {
    for (const doc of [
      "docs/SEO_AUDIT_REPORT.md",
      "docs/SEO_KEYWORD_MAP.md",
      "docs/HELP_CENTER_ROADMAP.md",
      "docs/INTERNAL_LINKING_AUDIT.md",
      "docs/SEO_POSITIONING.md",
      "docs/SEO_LAUNCH_READINESS.md",
    ]) {
      assert.ok(read(doc).length > 200, doc);
    }
  });
});
