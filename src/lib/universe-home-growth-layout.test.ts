import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

describe("universe homepage growth sidebar layout", () => {
  it("uses hero grid with copy and centered universe zone", () => {
    const source = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home-page.tsx"),
      "utf8"
    );
    assert.match(source, /home-hero-grid/);
    assert.match(source, /home-hero-copy/);
    assert.match(source, /home-universe-zone/);
    assert.match(source, /data-testid="home-hero-grid"/);
    assert.match(source, /data-testid="home-universe-zone"/);
  });

  it("renders hero CTAs once without duplicate quick-action overlap in hero", () => {
    const heroSource = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-hero-copy.tsx"),
      "utf8"
    );
    assert.match(heroSource, /data-testid="universe-hero-ctas"/);
    assert.match(heroSource, /resolveUniversePrimaryCtaKey/);
    assert.match(heroSource, /universe\.quick\.openLibrary/);
    assert.doesNotMatch(heroSource, /UniverseQuickActions/);
    assert.doesNotMatch(heroSource, /universe\.hero\.oneProject/);
    assert.doesNotMatch(heroSource, /universe\.productionLine\.title/);
  });

  it("keeps production line title only in after-hero section", () => {
    const homeSource = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home-page.tsx"),
      "utf8"
    );
    const sectionsSource = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home-sections.tsx"),
      "utf8"
    );
    assert.match(homeSource, /home-after-hero/);
    assert.match(homeSource, /UniverseHomeSpaceShowcase/);
    assert.match(homeSource, /UniverseHomeSections/);
    assert.match(sectionsSource, /UniverseProductionLine/);
    assert.doesNotMatch(homeSource, /UniverseMarketingSections/);
    assert.doesNotMatch(homeSource, /UniverseQuickActions/);
  });

  it("hides duplicate quick actions for authenticated users", () => {
    const source = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home-page.tsx"),
      "utf8"
    );
    assert.doesNotMatch(source, /UniverseQuickActions/);
  });

  it("places capabilities and recent sections after hero", () => {
    const source = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home-page.tsx"),
      "utf8"
    );
    assert.match(source, /home-after-hero[\s\S]*UniverseHomeSections/);
    const sectionsSource = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home-sections.tsx"),
      "utf8"
    );
    assert.match(sectionsSource, /universe-home-recent-projects/);
    assert.match(sectionsSource, /universe-home-recent-assets/);
    assert.match(sectionsSource, /universe-home-capabilities/);
  });

  it("universe zone is in normal flow, not absolute overlay", () => {
    const source = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home-page.tsx"),
      "utf8"
    );
    const css = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home.css"),
      "utf8"
    );
    assert.doesNotMatch(source, /home-universe-zone[\s\S]*absolute/);
    assert.match(css, /\.home-universe-zone/);
    assert.match(css, /justify-content:\s*center/);
  });

  it("keeps growth sidebar in layout mount, not homepage overlay", () => {
    const mountSource = readFileSync(
      join(ROOT, "src/components/assistant/homecheff-assistant-mount.tsx"),
      "utf8"
    );
    const homeSource = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home-page.tsx"),
      "utf8"
    );
    assert.match(mountSource, /GrowthSidebarLayout/);
    assert.doesNotMatch(homeSource, /GrowthSidebar/);
  });
});
