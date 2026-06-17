import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

describe("universe home space showcase carousel", () => {
  it("SpaceGallery component exists with floating constellation behavior", () => {
    const source = readFileSync(
      join(ROOT, "src/components/examples/space-gallery.tsx"),
      "utf8"
    );
    assert.match(source, /export function SpaceGallery/);
    assert.match(source, /data-testid="space-gallery"/);
    assert.match(source, /constellationPosition/);
    assert.match(source, /space-orbit-float/);
  });

  it("homepage renders showcase between hero and after-hero sections", () => {
    const home = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home-page.tsx"),
      "utf8"
    );
    const showcase = home.indexOf("<UniverseHomeSpaceShowcase");
    const afterHero = home.indexOf('data-testid="home-after-hero"');
    const heroGrid = home.indexOf('data-testid="home-hero-grid"');
    assert.ok(showcase > 0 && afterHero > showcase && heroGrid < showcase);
  });

  it("showcase loads admin-managed catalog via API with pageKey", () => {
    const showcase = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home-space-showcase.tsx"),
      "utf8"
    );
    assert.match(showcase, /useShowcaseExamples/);
    assert.match(showcase, /pageKey/);
    assert.match(showcase, /SpaceGallery/);
  });

  it("admin examples page is showcase carousel editor", () => {
    const admin = readFileSync(join(ROOT, "src/app/admin/examples/page.tsx"), "utf8");
    assert.match(admin, /ShowcaseCarouselAdminPanel/);
  });

  it("data source is DB-backed with static fallback", () => {
    const resolve = readFileSync(join(ROOT, "src/lib/showcase-item-resolve.ts"), "utf8");
    assert.match(resolve, /HOMECHEFF_EXAMPLES|listAllExamples/);
    const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
    assert.match(schema, /model StudioShowcaseItem/);
  });
});
