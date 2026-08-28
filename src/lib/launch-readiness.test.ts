import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

describe("launch readiness", () => {
  it("vidu getVideoJobStatus parses provider credits", () => {
    const vidu = readFileSync(join(ROOT, "src/server/video-providers/vidu.ts"), "utf8");
    assert.match(vidu, /providerCreditsUsed/);
  });

  it("backfill and profitability scripts exist", () => {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf8");
    assert.match(pkg, /backfill:vidu-costs/);
    assert.match(pkg, /audit:profitability/);
  });

  it("sitemap and robots are configured", () => {
    assert.match(readFileSync(join(ROOT, "src/app/sitemap.ts"), "utf8"), /SEO_SITEMAP_PATHS/);
    assert.match(readFileSync(join(ROOT, "src/app/robots.ts"), "utf8"), /sitemap/);
  });

  it("onboarding API and checklist exist", () => {
    assert.match(
      readFileSync(join(ROOT, "src/app/api/me/onboarding/route.ts"), "utf8"),
      /loadOnboardingProgress/
    );
    assert.match(
      readFileSync(join(ROOT, "src/components/onboarding/onboarding-checklist.tsx"), "utf8"),
      /onboarding-checklist/
    );
  });

  it("conversion surfaces on billing and help", () => {
    assert.match(
      readFileSync(join(ROOT, "src/components/account/studio-unified-billing-dashboard.tsx"), "utf8"),
      /pageType="billing"/
    );
    assert.match(
      readFileSync(join(ROOT, "src/components/help/help-center-pages.tsx"), "utf8"),
      /ConversionSurfaceArticleFooter/
    );
  });
});
