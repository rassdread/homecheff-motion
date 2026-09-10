import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";

describe("studio mobile home UX cleanup", () => {
  it("hides orbit below lg and does not force display:flex in CSS", () => {
    const home = readFileSync("src/components/suite/universe/universe-home-page.tsx", "utf8");
    const css = readFileSync("src/components/suite/universe/universe-home.css", "utf8");
    assert.match(home, /home-universe-zone hidden lg:flex/);
    assert.match(home, /UniverseHomeMobileQuickActions/);
    assert.doesNotMatch(css, /\.home-universe-zone\s*\{[^}]*display:\s*flex/);
  });

  it("mobile product nav covers all five planet destinations", () => {
    const mobile = readFileSync(
      "src/components/suite/universe/universe-home-mobile-quick-actions.tsx",
      "utf8"
    );
    assert.match(mobile, /UNIVERSE_PLANETS/);
    assert.match(mobile, /home-mobile-product-nav/);
    assert.match(mobile, /home-mobile-ctas/);
    assert.match(mobile, /lg:hidden/);
    assert.match(mobile, /min-h-\[52px\]/);
    assert.match(mobile, /min-h-\[48px\]/);
  });

  it("keeps desktop hero CTAs and mobile CTAs mutually exclusive by breakpoint", () => {
    const hero = readFileSync("src/components/suite/universe/universe-hero-copy.tsx", "utf8");
    assert.match(hero, /hidden flex-wrap[\s\S]*lg:flex/);
    assert.match(hero, /data-testid="universe-hero-ctas"/);
  });

  it("compacts Ontdek trigger on narrow widths with i18n short label", () => {
    const menu = readFileSync("src/components/ecosystem/ontdek-homecheff-menu.tsx", "utf8");
    assert.match(menu, /ecosystem\.nav\.labelShort/);
    assert.match(menu, /sm:hidden/);
    assert.match(menu, /max-w-\[min\(100%,11\.5rem\)\]/);
    assert.equal(nl["ecosystem.nav.labelShort"], "Ontdek");
    assert.equal(en["ecosystem.nav.labelShort"], "Discover");
    assert.equal(nl["universe.mobile.productNav"], "Studio-producten");
    assert.equal(en["universe.mobile.productNav"], "Studio products");
  });
});
