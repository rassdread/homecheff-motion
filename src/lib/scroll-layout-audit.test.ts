import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  assertRouteFileScrollSafe,
  ASSISTANT_ROUTE_SCROLL_AUDIT,
  GROWTH_SIDEBAR_SCROLL_CONTRACT,
  isMainContentScrollSafe,
  layoutContainerIsScrollSafe,
  pageRootIsScrollSafe,
  SCROLL_AUDIT_FILES,
  sidebarHasOwnScroll,
} from "@/lib/scroll-layout-audit";
import { growthSidebarLayoutClasses } from "@/lib/growth-sidebar-layout";

const ROOT = process.cwd();

function forbiddenPattern(marker: string): RegExp {
  if (marker === "h-full") {
    return /(?<!min-)h-full\b/;
  }
  return new RegExp(marker);
}

describe("scroll layout audit", () => {
  it("marks growth sidebar main as scroll-safe", () => {
    assert.ok(isMainContentScrollSafe(growthSidebarLayoutClasses.main));
    assert.ok(layoutContainerIsScrollSafe(growthSidebarLayoutClasses.container));
    assert.ok(sidebarHasOwnScroll(growthSidebarLayoutClasses.sidebarColumn));
    assert.ok(pageRootIsScrollSafe(growthSidebarLayoutClasses.pageRoot));
  });

  it("documents growth sidebar scroll contract", () => {
    assert.equal(GROWTH_SIDEBAR_SCROLL_CONTRACT.container, growthSidebarLayoutClasses.container);
    assert.ok(sidebarHasOwnScroll(GROWTH_SIDEBAR_SCROLL_CONTRACT.sidebarColumn));
    assert.ok(isMainContentScrollSafe(GROWTH_SIDEBAR_SCROLL_CONTRACT.main));
  });

  for (const audit of SCROLL_AUDIT_FILES) {
    it(`avoids scroll traps in ${audit.path}`, () => {
      const source = readFileSync(join(ROOT, audit.path), "utf8");
      for (const forbidden of audit.forbidden) {
        assert.doesNotMatch(
          source,
          forbiddenPattern(forbidden),
          `${audit.path} must not use ${forbidden}`
        );
      }
      for (const required of audit.requiredSafe ?? []) {
        assert.match(source, new RegExp(required), `${audit.path} should include ${required}`);
      }
    });
  }

  for (const routeAudit of ASSISTANT_ROUTE_SCROLL_AUDIT) {
    it(`assistant route ${routeAudit.route} page roots stay document-scroll safe`, () => {
      for (const file of routeAudit.files) {
        const source = readFileSync(join(ROOT, file), "utf8");
        assert.doesNotThrow(() => assertRouteFileScrollSafe(source, file), file);
      }
    });
  }

  it("homepage document scrolls (no overflow-y-auto trap on root)", () => {
    const source = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home-page.tsx"),
      "utf8"
    );
    assert.match(source, /data-testid="universe-home-page"/);
    assert.doesNotMatch(source, /overflow-y-auto/);
    assert.match(source, /growthSidebarLayoutClasses\.pageRoot/);
  });

  it("growth sidebar mount does not gate on auth", () => {
    const mountSource = readFileSync(
      join(ROOT, "src/components/assistant/homecheff-assistant-mount.tsx"),
      "utf8"
    );
    const sidebarSource = readFileSync(
      join(ROOT, "src/components/growth/growth-sidebar.tsx"),
      "utf8"
    );
    assert.match(mountSource, /data-assistant-mount/);
    assert.doesNotMatch(mountSource, /isAuthenticated|session\.user|auth/i);
    assert.match(sidebarSource, /growth-sidebar-public-discovery/);
    assert.match(sidebarSource, /growth-sidebar-login-cta/);
  });

  it("editor and publish landing pages avoid body scroll lock", () => {
    for (const path of [
      "src/components/suite/studio-product-landing-page.tsx",
      "src/components/editor/editor-start-screen.tsx",
      "src/components/publish/publish-product-page.tsx",
    ]) {
      const source = readFileSync(join(ROOT, path), "utf8");
      assert.doesNotMatch(source, /\bh-screen\b/, path);
    }
  });

  it("mobile assistant uses bottom sheet with own scroll", () => {
    const source = readFileSync(
      join(ROOT, "src/components/assistant/homecheff-assistant.tsx"),
      "utf8"
    );
    assert.match(source, /overflow-y-auto/);
    assert.match(source, /homecheff-assistant-fab-mobile/);
  });
});
