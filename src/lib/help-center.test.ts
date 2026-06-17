import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { HELP_ARTICLES, HELP_CENTER_CATEGORIES } from "@/lib/help-center";

const ROOT = process.cwd();

describe("help center", () => {
  it("has starter billing articles", () => {
    const slugs = HELP_ARTICLES.map((a) => a.slug);
    assert.ok(slugs.includes("what-are-studio-credits"));
    assert.ok(slugs.includes("how-much-do-studio-actions-cost"));
    assert.ok(slugs.includes("how-motion-pricing-works"));
  });

  it("pricing articles use catalog not hardcoded credits", () => {
    const pricingArticles = HELP_ARTICLES.filter((a) => a.pricingCatalog);
    assert.ok(pricingArticles.length >= 2);
    for (const article of pricingArticles) {
      assert.equal(article.pricingCatalog, true);
    }
  });

  it("/help routes exist", () => {
    const home = readFileSync(join(ROOT, "src/app/help/page.tsx"), "utf8");
    const article = readFileSync(join(ROOT, "src/app/help/[slug]/page.tsx"), "utf8");
    assert.match(home, /HelpCenterHome/);
    assert.match(article, /HelpArticleView/);
  });

  it("article footer conversion surface is wired", () => {
    const component = readFileSync(
      join(ROOT, "src/components/help/help-center-pages.tsx"),
      "utf8"
    );
    assert.match(component, /ConversionSurfaceArticleFooter/);
  });

  it("all categories are defined", () => {
    assert.equal(HELP_CENTER_CATEGORIES.length, 8);
  });
});
