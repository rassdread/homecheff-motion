import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildPublicHomepageDiscoveryRecommendations,
  PUBLIC_HOMEPAGE_DISCOVERY_IDS,
} from "@/lib/growth-sidebar-public-discovery";
import {
  CANONICAL_HOMEPAGE_COMPONENT,
  HOMEPAGE_RENDER_MATRIX,
  HOMEPAGE_ROUTE_FILE,
  HOMEPAGE_SHELL_CHAIN,
  resolveHomepageAuthMode,
  resolveHomepageRender,
} from "@/lib/homepage-render-trace";
import { growthSidebarLayoutClasses } from "@/lib/growth-sidebar-layout";

const ROOT = process.cwd();

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("homepage render audit", () => {
  it("documents a single route file for /", () => {
    const pageSource = read("src/app/page.tsx");
    assert.match(pageSource, /from "@\/components\/landing\/home-page"/);
    assert.match(pageSource, /<HomePage/);
    assert.doesNotMatch(pageSource, /HomeEcosystemPage|LegacyHomeRedirect|StudioLandingRoute/);
  });

  it("canonical HomePage always renders StudioUnifiedHomePage", () => {
    const homePageSource = read("src/components/landing/home-page.tsx");
    assert.match(homePageSource, /StudioUnifiedHomePage/);
    assert.doesNotMatch(homePageSource, /UniverseHomePage/);
    assert.doesNotMatch(homePageSource, /LegacyHomeRedirect/);
    assert.doesNotMatch(homePageSource, /HomeEcosystemPage/);
    assert.doesNotMatch(homePageSource, /isHomeCheffProductSuiteNavEnabled/);
    assert.doesNotMatch(homePageSource, /router\.replace\(["']\/studio["']\)/);
  });

  it("auth mode does not swap homepage component in render matrix", () => {
    const loggedOut = HOMEPAGE_RENDER_MATRIX.find((row) => row.auth === "logged-out");
    const loggedIn = HOMEPAGE_RENDER_MATRIX.find((row) => row.auth === "logged-in");
    assert.ok(loggedOut && loggedIn);
    assert.equal(loggedOut.resolution.pageComponent, CANONICAL_HOMEPAGE_COMPONENT);
    assert.equal(loggedIn.resolution.pageComponent, CANONICAL_HOMEPAGE_COMPONENT);
    assert.equal(loggedOut.resolution.pageComponent, loggedIn.resolution.pageComponent);
  });

  it("assistant disabled still uses the canonical homepage without sidebar shell", () => {
    const resolution = resolveHomepageRender({
      suiteNavEnabled: true,
      assistantEnabled: false,
      assistantRoute: true,
    });
    assert.equal(resolution.pageComponent, CANONICAL_HOMEPAGE_COMPONENT);
    assert.equal(resolution.usesGrowthSidebarLayout, false);
    assert.equal(resolution.legacyHomeEcosystemBypass, false);
  });

  it("assistant enabled wraps homepage in growth sidebar shell", () => {
    const resolution = resolveHomepageRender({
      suiteNavEnabled: true,
      assistantEnabled: true,
      assistantRoute: true,
    });
    assert.equal(resolution.usesAppShell, true);
    assert.equal(resolution.usesGrowthSidebarLayout, true);
    assert.equal(resolution.usesAssistantProvider, true);
  });

  it("resolveHomepageAuthMode maps session states", () => {
    assert.equal(resolveHomepageAuthMode({ resolved: false, hasUser: false }), "unknown");
    assert.equal(resolveHomepageAuthMode({ resolved: true, hasUser: false }), "logged-out");
    assert.equal(resolveHomepageAuthMode({ resolved: true, hasUser: true }), "logged-in");
  });

  it("shell chain documents AppShell → assistant mount → growth layout → universe home", () => {
    assert.ok(HOMEPAGE_SHELL_CHAIN.some((line) => line.includes("AppShell")));
    assert.ok(HOMEPAGE_SHELL_CHAIN.some((line) => line.includes("GrowthSidebarLayout")));
    assert.ok(HOMEPAGE_SHELL_CHAIN.some((line) => line.includes(CANONICAL_HOMEPAGE_COMPONENT)));
    assert.equal(HOMEPAGE_ROUTE_FILE, "src/app/page.tsx");
  });

  it("logged-out homepage includes render markers in source", () => {
    assert.match(read("src/components/layout/app-shell.tsx"), /data-route-shell="app-shell"/);
    assert.match(read("src/components/assistant/homecheff-assistant-mount.tsx"), /data-assistant-mount/);
    assert.match(read("src/components/growth/growth-sidebar-layout.tsx"), /data-growth-sidebar-layout="true"/);
    const home = read("src/components/studio/studio-unified-home-page.tsx");
    assert.match(home, /data-homepage-component=\{CANONICAL_HOMEPAGE_COMPONENT\}/);
    assert.match(home, /StudioAiHomeComposer/);
    assert.match(read("src/components/growth/growth-sidebar.tsx"), /data-testid="growth-sidebar"/);
    assert.match(read("src/components/growth/growth-sidebar.tsx"), /StudioHomeContextPanel/);
  });

  it("logged-out homepage root is scroll-safe without page floor trap", () => {
    const universe = read("src/components/suite/universe/universe-home-page.tsx");
    assert.match(universe, /growthSidebarLayoutClasses\.pageRoot/);
    assert.doesNotMatch(universe, /growthSidebarLayoutClasses\.pageFloor/);
    assert.doesNotMatch(universe, /overflow-y-auto/);
    assert.doesNotMatch(universe, /\bh-screen\b/);
  });

  it("canonical homepage is one composer plus project history, not the old welcome page", () => {
    const home = read("src/components/landing/home-page.tsx");
    const unified = read("src/components/studio/studio-unified-home-page.tsx");
    assert.match(home, /StudioUnifiedHomePage/);
    assert.doesNotMatch(home, /UniverseHomePage|UniverseHeroCopy|UniverseDestinationLinks/);
    assert.match(unified, /StudioAiHomeComposer/);
    assert.match(unified, /studio-v24-history/);
    assert.doesNotMatch(unified, /UniverseHeroCopy|UniverseDestinationLinks/);
  });

  it("logged-out public discovery cards are static catalog entries", () => {
    const cards = buildPublicHomepageDiscoveryRecommendations();
    assert.equal(cards.length, PUBLIC_HOMEPAGE_DISCOVERY_IDS.length);
    assert.deepEqual(
      cards.map((row) => row.id),
      [...PUBLIC_HOMEPAGE_DISCOVERY_IDS]
    );
    assert.ok(cards.some((row) => row.id === "goal_celebration"));
    assert.ok(cards.some((row) => row.id === "red_carpet_moment"));
    assert.ok(cards.some((row) => row.id === "outfit_on_self"));
  });

  it("logged-out recommendation click routes to login, not private library fetch", () => {
    const sidebar = read("src/components/growth/growth-sidebar.tsx");
    assert.match(sidebar, /handleRecommendationSelect/);
    assert.match(sidebar, /if \(canonicalHome\) \{\s*requestStudioHomeComposerPrompt/);
    assert.match(sidebar, /window\.location\.assign\(loginLink\)/);
    assert.match(sidebar, /buildPublicHomepageDiscoveryRecommendations/);
    const provider = read("src/components/assistant/homecheff-assistant-provider.tsx");
    assert.match(provider, /if \(!isAuthenticated\)\s*\{\s*queueMicrotask/);
    assert.match(provider, /if \(!isAuthenticated\)\s*\{\s*setMessages/);
  });

  it("logged-out homepage sections skip private library API", () => {
    const sections = read("src/components/suite/universe/universe-home-sections.tsx");
    assert.match(sections, /if \(!isAuthenticated\)/);
    assert.match(sections, /useAuthSession/);
  });

  it("mount does not auth-gate sidebar visibility", () => {
    const mount = read("src/components/assistant/homecheff-assistant-mount.tsx");
    assert.doesNotMatch(mount, /isAuthenticated|session\.user/);
    assert.match(mount, /GrowthSidebarLayout showSidebar/);
  });

  it("no duplicate active homepage route components for /", () => {
    const page = read("src/app/page.tsx");
    const homePage = read("src/components/landing/home-page.tsx");
    assert.doesNotMatch(page, /StudioProductLandingPage|SuiteHomePage|HomeEcosystemPage/);
    assert.doesNotMatch(homePage, /StudioProductLandingPage|SuiteHomePage|HomeEcosystemPage/);
  });

  it("universe homepage uses pageRoot scroll contract", () => {
    assert.ok(growthSidebarLayoutClasses.pageRoot.includes("overflow-visible"));
  });
});
