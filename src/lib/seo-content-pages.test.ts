import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  ALTERNATIVES_CONTENT,
  ALTERNATIVE_SLUGS,
} from "@/lib/seo/alternatives-content";
import { GUIDES_CONTENT, GUIDE_SLUGS } from "@/lib/seo/guides-content";
import { INDUSTRIES_CONTENT, INDUSTRY_SLUGS } from "@/lib/seo/industries-content";
import { LOCATIONS_CONTENT, LOCATION_SLUGS } from "@/lib/seo/locations-content";
import { countSeoContentWords } from "@/lib/seo/seo-content-wave2-builder";
import { SEO_CONTENT_PATHS } from "@/lib/seo/seo-content-paths";
import {
  ALTERNATIVE_WAVE2_SLUGS,
  GUIDE_WAVE2_SLUGS,
  WORKFLOW_WAVE2_SLUGS,
} from "@/lib/seo/seo-wave2-content";
import {
  INDUSTRY_WAVE3_SLUGS,
  LOCATION_WAVE3_SLUGS,
  LONGTAIL_GUIDE_WAVE3_SLUGS,
  USE_CASE_WAVE3_SLUGS,
  WAVE3_PAGE_COUNT,
} from "@/lib/seo/seo-wave3-content";
import { SEO_PUBLIC_PATHS } from "@/lib/seo/site-metadata";
import { USE_CASES_CONTENT, USE_CASE_SLUGS } from "@/lib/seo/use-cases-content";
import { WORKFLOWS_CONTENT, WORKFLOW_SLUGS } from "@/lib/seo/workflows-content";

const ROOT = process.cwd();

describe("SEO content pages implementation", () => {
  it("registers all SEO content routes in sitemap paths", () => {
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
    for (const slug of LOCATION_SLUGS) {
      const path = `/locations/${slug}`;
      assert.ok(SEO_PUBLIC_PATHS.includes(path as (typeof SEO_PUBLIC_PATHS)[number]), path);
    }
    for (const slug of USE_CASE_SLUGS) {
      const path = `/use-cases/${slug}`;
      assert.ok(SEO_PUBLIC_PATHS.includes(path as (typeof SEO_PUBLIC_PATHS)[number]), path);
    }
    for (const slug of INDUSTRY_SLUGS) {
      const path = `/industries/${slug}`;
      assert.ok(SEO_PUBLIC_PATHS.includes(path as (typeof SEO_PUBLIC_PATHS)[number]), path);
    }
    assert.equal(SEO_CONTENT_PATHS.length, 284);
  });

  it("wave 2 adds 100 indexable pages", () => {
    assert.equal(ALTERNATIVE_WAVE2_SLUGS.length, 25);
    assert.equal(GUIDE_WAVE2_SLUGS.length, 40);
    assert.equal(WORKFLOW_WAVE2_SLUGS.length, 35);
    assert.equal(
      ALTERNATIVE_WAVE2_SLUGS.length + GUIDE_WAVE2_SLUGS.length + WORKFLOW_WAVE2_SLUGS.length,
      100
    );
  });

  it("wave 3 adds 150 indexable pages across four clusters", () => {
    assert.equal(LOCATION_WAVE3_SLUGS.length, 20);
    assert.equal(USE_CASE_WAVE3_SLUGS.length, 20);
    assert.equal(INDUSTRY_WAVE3_SLUGS.length, 20);
    assert.equal(LONGTAIL_GUIDE_WAVE3_SLUGS.length, 90);
    assert.equal(WAVE3_PAGE_COUNT, 150);
  });

  it("has dynamic route pages for all SEO clusters", () => {
    assert.match(readFileSync(join(ROOT, "src/app/alternatives/[slug]/page.tsx"), "utf8"), /generateStaticParams/);
    assert.match(readFileSync(join(ROOT, "src/app/guides/[slug]/page.tsx"), "utf8"), /generateStaticParams/);
    assert.match(readFileSync(join(ROOT, "src/app/workflows/[slug]/page.tsx"), "utf8"), /generateStaticParams/);
    assert.match(readFileSync(join(ROOT, "src/app/locations/[slug]/page.tsx"), "utf8"), /generateStaticParams/);
    assert.match(readFileSync(join(ROOT, "src/app/use-cases/[slug]/page.tsx"), "utf8"), /generateStaticParams/);
    assert.match(readFileSync(join(ROOT, "src/app/industries/[slug]/page.tsx"), "utf8"), /generateStaticParams/);
  });

  it("renders SEO content with JSON-LD and CTAs", () => {
    const view = readFileSync(join(ROOT, "src/components/seo/seo-content-page.tsx"), "utf8");
    assert.match(view, /buildSeoLandingJsonLd/);
    assert.match(view, /\/pricing/);
    assert.match(view, /\/signup/);
    assert.match(view, /faq/i);
  });

  it("each alternative has FAQs and disclaimer", () => {
    for (const slug of ALTERNATIVE_SLUGS) {
      const page = ALTERNATIVES_CONTENT[slug as keyof typeof ALTERNATIVES_CONTENT];
      assert.ok(page, slug);
      assert.equal(page.faqs.length, 5, slug);
      assert.ok(page.disclaimers?.some((d) => /not affiliated/i.test(d)), slug);
    }
  });

  it("wave 2 pages have at least 1000 words and 5 FAQs", () => {
    for (const slug of ALTERNATIVE_WAVE2_SLUGS) {
      const page = ALTERNATIVES_CONTENT[slug as keyof typeof ALTERNATIVES_CONTENT];
      assert.ok(page, slug);
      assert.equal(page.faqs.length, 5, slug);
      assert.ok(countSeoContentWords(page) >= 1000, `${slug} word count`);
    }
    for (const slug of GUIDE_WAVE2_SLUGS) {
      const page = GUIDES_CONTENT[slug as keyof typeof GUIDES_CONTENT];
      assert.ok(page, slug);
      assert.equal(page.faqs.length, 5, slug);
      assert.ok(countSeoContentWords(page) >= 1000, `${slug} word count`);
    }
    for (const slug of WORKFLOW_WAVE2_SLUGS) {
      const page = WORKFLOWS_CONTENT[slug as keyof typeof WORKFLOWS_CONTENT];
      assert.ok(page, slug);
      assert.equal(page.faqs.length, 5, slug);
      assert.ok(countSeoContentWords(page) >= 1000, `${slug} word count`);
    }
  });

  it("wave 3 pages have at least 1000 words and 5 FAQs", () => {
    for (const slug of LOCATION_WAVE3_SLUGS) {
      const page = LOCATIONS_CONTENT[slug as keyof typeof LOCATIONS_CONTENT];
      assert.ok(page, slug);
      assert.equal(page.faqs.length, 5, slug);
      assert.ok(countSeoContentWords(page) >= 1000, `${slug} word count`);
    }
    for (const slug of USE_CASE_WAVE3_SLUGS) {
      const page = USE_CASES_CONTENT[slug as keyof typeof USE_CASES_CONTENT];
      assert.ok(page, slug);
      assert.equal(page.faqs.length, 5, slug);
      assert.ok(countSeoContentWords(page) >= 1000, `${slug} word count`);
    }
    for (const slug of INDUSTRY_WAVE3_SLUGS) {
      const page = INDUSTRIES_CONTENT[slug as keyof typeof INDUSTRIES_CONTENT];
      assert.ok(page, slug);
      assert.equal(page.faqs.length, 5, slug);
      assert.ok(countSeoContentWords(page) >= 1000, `${slug} word count`);
    }
    for (const slug of LONGTAIL_GUIDE_WAVE3_SLUGS) {
      const page = GUIDES_CONTENT[slug as keyof typeof GUIDES_CONTENT];
      assert.ok(page, slug);
      assert.equal(page.faqs.length, 5, slug);
      assert.ok(countSeoContentWords(page) >= 1000, `${slug} word count`);
    }
  });
});
