import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { ALTERNATIVE_SLUGS } from "@/lib/seo/alternatives-content";
import { GUIDE_SLUGS } from "@/lib/seo/guides-content";
import { SEO_CONTENT_PATHS } from "@/lib/seo/seo-content-paths";
import { SEO_PUBLIC_PATHS } from "@/lib/seo/site-metadata";
import { WORKFLOW_SLUGS } from "@/lib/seo/workflows-content";

const ROOT = process.cwd();

describe("SEO content pages implementation", () => {
  it("registers all alternative, guide, and workflow routes in sitemap paths", () => {
    for (const slug of ALTERNATIVE_SLUGS) {
      const path = `/alternatives/${slug}`;
      assert.ok(SEO_PUBLIC_PATHS.includes(path as (typeof SEO_PUBLIC_PATHS)[number]), path);
    }
    for (const slug of GUIDE_SLUGS) {
      const path = `/guides/${slug}`;
      assert.ok(SEO_PUBLIC_PATHS.includes(path as (typeof SEO_PUBLIC_PATHS)[number]), path);
    }
    for (const slug of WORKFLOW_SLUGS) {
      const path = `/workflows/${slug}`;
      assert.ok(SEO_PUBLIC_PATHS.includes(path as (typeof SEO_PUBLIC_PATHS)[number]), path);
    }
    assert.equal(SEO_CONTENT_PATHS.length, 31);
  });

  it("has dynamic route pages for alternatives, guides, and workflows", () => {
    assert.match(readFileSync(join(ROOT, "src/app/alternatives/[slug]/page.tsx"), "utf8"), /generateStaticParams/);
    assert.match(readFileSync(join(ROOT, "src/app/guides/[slug]/page.tsx"), "utf8"), /generateStaticParams/);
    assert.match(readFileSync(join(ROOT, "src/app/workflows/[slug]/page.tsx"), "utf8"), /generateStaticParams/);
  });

  it("renders SEO content with JSON-LD and CTAs", () => {
    const view = readFileSync(join(ROOT, "src/components/seo/seo-content-page.tsx"), "utf8");
    assert.match(view, /buildSeoLandingJsonLd/);
    assert.match(view, /\/pricing/);
    assert.match(view, /\/signup/);
    assert.match(view, /faq/i);
  });

  it("each alternative has FAQs and disclaimer", () => {
    const content = readFileSync(join(ROOT, "src/lib/seo/alternatives-content.ts"), "utf8");
    assert.match(content, /not affiliated/i);
    for (const slug of ALTERNATIVE_SLUGS) {
      assert.match(content, new RegExp(`"${slug}"`));
    }
  });
});
