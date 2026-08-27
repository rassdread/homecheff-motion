import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PRICING_FAQ_SCHEMA } from "@/lib/seo/structured-data";
import { STUDIO_PLANS } from "@/server/studio-account/studio-plan-config";

const root = process.cwd();

describe("Studio pre-promotion legal surfaces", () => {
  it("privacy/terms/cookies routes exist", () => {
    for (const p of [
      "src/app/privacy/page.tsx",
      "src/app/terms/page.tsx",
      "src/app/cookies/page.tsx",
    ]) {
      assert.ok(existsSync(join(root, p)), p);
    }
  });

  it("site footer links legal pages and forbids income guarantee", () => {
    const footer = readFileSync(join(root, "src/components/layout/studio-site-footer.tsx"), "utf8");
    assert.match(footer, /href="\/privacy"/);
    assert.match(footer, /href="\/terms"/);
    assert.match(footer, /href="\/cookies"/);
    assert.match(footer, /not guaranteed income/);
    assert.match(footer, /support@homecheff\.eu/);
  });

  it("app shell mounts studio site footer", () => {
    const chrome = readFileSync(join(root, "src/components/layout/app-shell-chrome.tsx"), "utf8");
    assert.match(chrome, /StudioSiteFooter/);
  });

  it("pricing FAQ schema does not claim monthly subscription credits", () => {
    assert.equal(STUDIO_PLANS.creator.monthlyCredits, 0);
    assert.equal(STUDIO_PLANS.pro.monthlyCredits, 0);
    assert.equal(STUDIO_PLANS.studio.monthlyCredits, 0);
    const blob = PRICING_FAQ_SCHEMA.map((x) => x.answer).join(" ").toLowerCase();
    assert.ok(!blob.includes("subscriptions add monthly credits"));
    assert.ok(blob.includes("monthly credit grants on subscriptions are currently 0") || blob.includes("do not grant a monthly credit"));
  });

  it("terms page does not claim royalty-free music library", () => {
    const terms = readFileSync(join(root, "src/app/terms/page.tsx"), "utf8");
    assert.match(terms, /royalty-free/);
    assert.match(terms, /unless a specific track licence/);
  });
});
