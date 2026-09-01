import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  DEFAULT_POST_AUTH_PATH,
  resolvePostAuthRedirect,
} from "@/lib/auth-post-auth-redirect";
import { CANONICAL_HOMEPAGE_COMPONENT } from "@/lib/homepage-render-trace";
import {
  CANONICAL_HOMEPAGE_PATH,
  LEGACY_HOMEPAGE_ALIAS_PATH,
  maakRouteUsesAssistantShell,
} from "@/lib/homepage-route-comparison";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("homepage route consolidation", () => {
  it("/ uses canonical HomePage → UniverseHomePage", () => {
    const page = read("src/app/page.tsx");
    const home = read("src/components/landing/home-page.tsx");
    assert.match(page, /HomePage/);
    assert.match(home, /UniverseHomePage/);
    assert.doesNotMatch(home, /MaakOrSuiteStartPage/);
  });

  it("/maak permanently redirects to /", () => {
    const maak = read("src/app/maak/page.tsx");
    assert.match(maak, /redirect\(["']\/["']\)/);
    assert.doesNotMatch(maak, /MaakOrSuiteStartPage|UniverseHomePage/);
  });

  it("logged-out and logged-in share UniverseHomePage on /", () => {
    const universe = read("src/components/suite/universe/universe-home-page.tsx");
    assert.match(universe, /data-page=\{pageMarker\}/);
    assert.match(universe, /studio-homepage/);
    assert.match(universe, /public-homepage/);
    assert.match(universe, /data-homepage-component=\{CANONICAL_HOMEPAGE_COMPONENT\}/);
    assert.match(universe, /data-auth-mode=\{authMode\}/);
    assert.doesNotMatch(read("src/components/landing/home-page.tsx"), /isAuthenticated.*UniverseHomePage/);
  });

  it("/maak was not assistant-enabled (root cause of scroll/sidebar divergence)", () => {
    assert.equal(maakRouteUsesAssistantShell(), false);
  });

  it("post-auth default lands on canonical /", () => {
    assert.equal(DEFAULT_POST_AUTH_PATH, CANONICAL_HOMEPAGE_PATH);
    assert.equal(resolvePostAuthRedirect(undefined), CANONICAL_HOMEPAGE_PATH);
    assert.equal(resolvePostAuthRedirect("/maak"), CANONICAL_HOMEPAGE_PATH);
  });

  it("homepage includes full row structure below hero", () => {
    const universe = read("src/components/suite/universe/universe-home-page.tsx");
    const sections = read("src/components/suite/universe/universe-home-sections.tsx");
    assert.match(universe, /UniverseHomeSpaceShowcase/);
    assert.match(sections, /universe-home-recent-projects/);
    assert.match(sections, /universe-home-recent-assets/);
    assert.match(sections, /universe-home-capabilities/);
    assert.match(sections, /universe-home-why-studio/);
    assert.match(sections, /universe-home-getting-started/);
    const showcaseIdx = universe.indexOf("<UniverseHomeSpaceShowcase />");
    const afterHeroIdx = universe.indexOf('data-testid="home-after-hero"');
    assert.ok(showcaseIdx > 0 && afterHeroIdx > showcaseIdx);
  });

  it("legacy nav creation entry points to /studio not /maak", () => {
    const nav = read("src/lib/homecheff-primary-nav-config.ts");
    assert.match(nav, /href: "\/studio"/);
    assert.doesNotMatch(nav, /labelKey: "nav\.create"/);
    const chrome = read("src/components/layout/app-shell-chrome.tsx");
    assert.match(chrome, /href="\/"/);
  });

  it("legacy alias path is documented", () => {
    assert.equal(LEGACY_HOMEPAGE_ALIAS_PATH, "/maak");
    assert.equal(CANONICAL_HOMEPAGE_COMPONENT, "universe-home-page");
  });

  it("homepage root is scroll-safe with growth sidebar shell", () => {
    const layout = read("src/lib/growth-sidebar-layout.ts");
    const sidebarMatch = layout.match(/sidebarColumn:\s*\n\s*"([^"]+)"/);
    assert.ok(sidebarMatch, "sidebarColumn class string");
    const sidebarColumn = sidebarMatch[1];
    assert.match(layout, /overflow-visible/);
    assert.match(sidebarColumn, /max-h-\[calc\(100dvh/);
    const withoutMaxHeight = sidebarColumn.replace(/max-h-\[calc[^\s]*/g, "");
    assert.doesNotMatch(withoutMaxHeight, /h-\[calc\(100dvh/);
  });
});
