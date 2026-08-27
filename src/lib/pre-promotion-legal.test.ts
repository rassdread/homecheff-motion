import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PRICING_FAQ_SCHEMA } from "@/lib/seo/structured-data";
import { STUDIO_PLANS } from "@/server/studio-account/studio-plan-config";
import { STUDIO_PUBLIC_FAQ, STUDIO_FAQ_REQUIRED_IDS } from "@/lib/studio-public-faq";
import { PHOTO_VIDEO_CATALOG_TRACKS } from "@/lib/photo-video/music-catalog";

const root = process.cwd();

const REQUIRED = [
  "what-is-studio",
  "who-for",
  "without-marketplace",
  "what-create",
  "file-types",
  "uploaded-media",
  "owns-uploads",
  "upload-rights",
  "exports",
  "commercial-use",
  "ai-limits",
  "ai-unique",
  "ai-providers",
  "ai-every-op",
  "ai-fail",
  "hc-when",
  "hc-fail",
  "plans",
  "plan-hc",
  "hc-accumulate",
  "hc-expire",
  "hc-after-cancel",
  "projects-after-cancel",
  "failed-renewal",
  "cancel",
  "cancel-when",
  "upgrade",
  "refunds",
  "own-music",
  "music-library",
  "watermark",
  "free-local",
  "affiliate",
  "international",
  "account-delete",
  "privacy-request",
  "copyright-abuse",
  "support",
];

describe("Studio final legal closeout", () => {
  it("1: Studio FAQ covers required topics", () => {
    const ids = new Set(STUDIO_FAQ_REQUIRED_IDS);
    for (const id of REQUIRED) assert.ok(ids.has(id), `missing ${id}`);
    assert.ok(existsSync(join(root, "src/app/faq/page.tsx")));
  });

  it("2: no licensed music library claim while catalog empty", () => {
    assert.equal(PHOTO_VIDEO_CATALOG_TRACKS.length, 0);
    const music = STUDIO_PUBLIC_FAQ.find((f) => f.id === "music-library")!;
    assert.match(music.answer, /No\.|empty/i);
    const en = readFileSync(join(root, "src/i18n/locales/en.ts"), "utf8");
    assert.ok(!en.includes('"px4a.audio.catalog": "Free music"'));
    assert.match(en, /No HomeCheff music library is included yet/);
  });

  it("3: AI output does not claim guaranteed exclusivity", () => {
    const uniq = STUDIO_PUBLIC_FAQ.find((f) => f.id === "ai-unique")!;
    assert.match(uniq.answer, /not guaranteed/i);
    assert.ok(!/always exclusively owned/i.test(STUDIO_PUBLIC_FAQ.map((f) => f.answer).join(" ")));
  });

  it("4: commercial-use wording qualifies third-party rights", () => {
    const c = STUDIO_PUBLIC_FAQ.find((f) => f.id === "commercial-use")!;
    assert.match(c.answer, /third-party rights/i);
  });

  it("legal routes and footer include FAQ", () => {
    for (const p of ["privacy", "terms", "cookies", "faq"]) {
      assert.ok(existsSync(join(root, `src/app/${p}/page.tsx`)));
    }
    const footer = readFileSync(join(root, "src/components/layout/studio-site-footer.tsx"), "utf8");
    assert.match(footer, /href="\/faq"/);
  });

  it("pricing FAQ schema matches monthlyCredits=0", () => {
    assert.equal(STUDIO_PLANS.creator.monthlyCredits, 0);
    const blob = PRICING_FAQ_SCHEMA.map((x) => x.answer).join(" ").toLowerCase();
    assert.ok(!blob.includes("subscriptions add monthly credits"));
  });

  it("terms state empty music catalog", () => {
    const terms = readFileSync(join(root, "src/app/terms/page.tsx"), "utf8");
    assert.match(terms, /empty/i);
    assert.match(terms, /AI_IP_COUNSEL_REVIEW_REQUIRED/);
  });
});
