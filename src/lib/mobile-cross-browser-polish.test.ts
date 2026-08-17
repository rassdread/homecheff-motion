import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

describe("mobile cross-browser polish", () => {
  it("hides omniverse and space gallery on mobile homepage", () => {
    const home = readFileSync(
      join(ROOT, "src/components/suite/universe/universe-home-page.tsx"),
      "utf8"
    );
    assert.match(home, /home-universe-zone hidden md:flex/);
    assert.match(home, /UniverseHomeMobileQuickActions/);
    assert.match(home, /hidden md:block[\s\S]*UniverseHomeSpaceShowcase/);
    assert.doesNotMatch(home, /UniverseMobileStack/);
  });

  it("mobile nav drawer uses fixed positioning and help/billing links", () => {
    const nav = readFileSync(
      join(ROOT, "src/components/layout/app-shell-primary-nav.tsx"),
      "utf8"
    );
    assert.match(nav, /studio-mobile-nav-backdrop/);
    assert.match(nav, /mobileNavDrawer/);
    assert.match(nav, /\/account\/billing/);
    assert.match(nav, /\/help/);
    assert.match(nav, /aria-label/);
  });

  it("app shell uses compact user bar and safe header on mobile", () => {
    const shell = readFileSync(join(ROOT, "src/components/layout/app-shell.tsx"), "utf8");
    const chrome = readFileSync(join(ROOT, "src/components/layout/app-shell-chrome.tsx"), "utf8");
    assert.match(chrome, /AppShellUserBar compact/);
    assert.match(shell, /overflow-x-clip/);
    const tokens = readFileSync(join(ROOT, "src/lib/studio-visual-tokens.ts"), "utf8");
    assert.match(tokens, /studio-header-safe/);
  });

  it("mobile polish stylesheet covers safe areas and overflow", () => {
    const css = readFileSync(join(ROOT, "src/app/mobile-polish.css"), "utf8");
    assert.match(css, /safe-area-inset-top/);
    assert.match(css, /safe-area-inset-bottom/);
    assert.match(css, /100dvh/);
    assert.match(css, /overflow-x: clip/);
    assert.match(css, /backdrop-filter/);
    assert.ok(existsSync(join(ROOT, "src/app/mobile-polish.css")));
    const globals = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
    assert.match(globals, /mobile-polish\.css/);
  });

  it("billing promo row stacks on mobile", () => {
    const panel = readFileSync(
      join(ROOT, "src/components/account/studio-billing-panel.tsx"),
      "utf8"
    );
    assert.match(panel, /flex-col gap-2 sm:flex-row/);
    assert.match(panel, /min-h-\[44px\]/);
  });
});
