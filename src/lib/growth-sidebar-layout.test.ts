import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  HOMECHEFF_ASSISTANT_EXACT_ROUTES,
  HOMECHEFF_ASSISTANT_ROUTE_PREFIXES,
  isHomeCheffAssistantRoute,
  normalizeAssistantRoutePathname,
} from "@/lib/homecheff-assistant-flag";
import {
  growthSidebarColumnHasOwnScroll,
  growthSidebarLayoutClasses,
  isGrowthSidebarDesktopColumnVisible,
  isGrowthSidebarMainScrollSafe,
} from "@/lib/growth-sidebar-layout";

const ROOT = process.cwd();

describe("homecheff assistant routes", () => {
  it('treats "/" as an assistant route', () => {
    assert.equal(isHomeCheffAssistantRoute("/"), true);
    assert.equal(isHomeCheffAssistantRoute("/?foo=bar"), true);
  });

  it("includes core product aliases", () => {
    const routes = [
      "/",
      "/studio",
      "/studio/assets",
      "/editor",
      "/animate/instant",
      "/motion",
      "/publish",
      "/projects",
      "/library",
      "/usage",
      "/mijn-verbruik",
      "/account/usage",
    ];
    for (const route of routes) {
      assert.equal(isHomeCheffAssistantRoute(route), true, route);
    }
  });

  it("normalizes trailing slashes except root", () => {
    assert.equal(normalizeAssistantRoutePathname("/editor/"), "/editor");
    assert.equal(normalizeAssistantRoutePathname("/"), "/");
  });

  it("exports explicit homepage and library exact routes", () => {
    assert.ok((HOMECHEFF_ASSISTANT_EXACT_ROUTES as readonly string[]).includes("/"));
    assert.ok((HOMECHEFF_ASSISTANT_ROUTE_PREFIXES as readonly string[]).includes("/studio"));
  });
});

describe("growth sidebar layout", () => {
  it("renders desktop sidebar column on assistant pages", () => {
    const layoutSource = readFileSync(
      join(ROOT, "src/components/growth/growth-sidebar-layout.tsx"),
      "utf8"
    );
    assert.match(layoutSource, /growth-sidebar-column/);
    assert.match(layoutSource, /GrowthSidebar/);
    assert.ok(isGrowthSidebarDesktopColumnVisible(growthSidebarLayoutClasses.sidebarColumn));
  });

  it("keeps main content scroll-safe (no overflow hidden)", () => {
    assert.ok(isGrowthSidebarMainScrollSafe(growthSidebarLayoutClasses.main));
    assert.doesNotMatch(growthSidebarLayoutClasses.container, /overflow-hidden/);
    assert.doesNotMatch(growthSidebarLayoutClasses.container, /flex-1/);
  });

  it("gives sidebar its own vertical scroll and resizable copilot width", () => {
    assert.ok(growthSidebarColumnHasOwnScroll(growthSidebarLayoutClasses.sidebarColumn));
    assert.match(
      growthSidebarLayoutClasses.sidebarColumn,
      /max-h-\[calc\(100dvh-var\(--studio-header-height\)\)\]/
    );
    const layoutSource = readFileSync(
      join(ROOT, "src/components/growth/growth-sidebar-layout.tsx"),
      "utf8"
    );
    assert.match(layoutSource, /copilotLayout\.width/);
    assert.match(layoutSource, /StudioCopilotResizeHandle/);
  });

  it("uses mobile FAB instead of fixed desktop column", () => {
    const assistantSource = readFileSync(
      join(ROOT, "src/components/assistant/homecheff-assistant.tsx"),
      "utf8"
    );
    const mountSource = readFileSync(
      join(ROOT, "src/components/assistant/homecheff-assistant-mount.tsx"),
      "utf8"
    );
    assert.match(assistantSource, /homecheff-assistant-fab-mobile/);
    assert.match(assistantSource, /lg:hidden/);
    assert.doesNotMatch(mountSource, /Suspense/);
  });

  it("mounts assistant shell on homepage without suspense fallback stripping sidebar", () => {
    const mountSource = readFileSync(
      join(ROOT, "src/components/assistant/homecheff-assistant-mount.tsx"),
      "utf8"
    );
    const providerSource = readFileSync(
      join(ROOT, "src/components/assistant/homecheff-assistant-provider.tsx"),
      "utf8"
    );
    assert.match(mountSource, /isHomeCheffAssistantRoute\(pathname\)/);
    assert.match(mountSource, /GrowthSidebarLayout showSidebar/);
    assert.doesNotMatch(providerSource, /Suspense/);
  });
});
