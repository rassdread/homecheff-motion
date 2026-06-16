import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { listAllExamples } from "@/lib/homecheff-examples";

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
    const showcase = home.indexOf("<UniverseHomeSpaceShowcase />");
    const afterHero = home.indexOf('data-testid="home-after-hero"');
    const heroGrid = home.indexOf('data-testid="home-hero-grid"');
    assert.ok(showcase > 0 && afterHero > showcase && heroGrid < showcase);
  });

  it("showcase uses admin examples catalog (all featured experiences)", () => {
    const showcase = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home-space-showcase.tsx"),
      "utf8"
    );
    assert.match(showcase, /listAllExamples/);
    assert.match(showcase, /SpaceGallery/);
    assert.ok(listAllExamples().length > 0);
  });

  it("admin examples page previews the same catalog", () => {
    const admin = readFileSync(join(ROOT, "src/app/admin/examples/page.tsx"), "utf8");
    assert.match(admin, /listAllExamples/);
    assert.match(admin, /SpaceGallery/);
  });

  it("data source is static catalog — no prisma model", () => {
    const examples = readFileSync(join(ROOT, "src/lib/homecheff-examples.ts"), "utf8");
    assert.match(examples, /HOMECHEFF_EXAMPLES/);
    const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
    assert.doesNotMatch(schema, /HomeCheffExample|homecheff_example/i);
  });
});
