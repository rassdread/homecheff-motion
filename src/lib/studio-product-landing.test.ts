import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSuitePrimaryNavItems } from "@/lib/homecheff-primary-nav-config";
import {
  editorLandingHasDeepLink,
  studioLandingHasDeepLink,
} from "@/lib/studio-product-landing-routes";
import {
  STUDIO_PRODUCT_LANDING_MODULES,
  studioProductLandingConfig,
} from "@/lib/studio-product-landing-config";
import { UNIVERSE_PLANETS } from "@/lib/universe-home-config";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";

describe("Studio product landing layer", () => {
  it("defines landing configs for all modules", () => {
    assert.equal(STUDIO_PRODUCT_LANDING_MODULES.length, 6);
    for (const moduleKey of STUDIO_PRODUCT_LANDING_MODULES) {
      const config = studioProductLandingConfig(moduleKey);
      assert.ok(config.primaryCtaHref.endsWith("/start") || config.primaryCtaHref.includes("/storyboards"));
      assert.ok(config.featureCardKeys.length >= 4);
    }
  });

  it("nav tabs route to landing pages", () => {
    const suite = buildSuitePrimaryNavItems();
    assert.equal(suite.find((item) => item.productId === "editor")?.href, "/editor");
    assert.equal(suite.find((item) => item.productId === "motion")?.href, "/motion");
    assert.equal(suite.find((item) => item.productId === "assets")?.href, "/library");
    assert.equal(suite.some((item) => item.href === "/usage"), false);
    assert.equal(suite.some((item) => item.labelKey === "nav.usage"), false);
  });

  it("CTA routes to actual workspace start paths", () => {
    assert.equal(studioProductLandingConfig("editor").primaryCtaHref, "/editor/start");
    assert.equal(studioProductLandingConfig("motion").primaryCtaHref, "/motion/start");
    assert.equal(studioProductLandingConfig("library").primaryCtaHref, "/library/start");
    assert.equal(studioProductLandingConfig("usage").primaryCtaHref, "/usage/start");
  });

  it("deep links bypass landing", () => {
    assert.equal(editorLandingHasDeepLink(new URLSearchParams("session=abc")), true);
    assert.equal(editorLandingHasDeepLink(new URLSearchParams()), false);
    assert.equal(studioLandingHasDeepLink(new URLSearchParams("storyboardId=sb1")), true);
    assert.equal(studioLandingHasDeepLink(new URLSearchParams()), false);
  });

  it("home planet links route to landing pages", () => {
    const editor = UNIVERSE_PLANETS.find((planet) => planet.id === "editor");
    const motion = UNIVERSE_PLANETS.find((planet) => planet.id === "motion");
    assert.equal(editor?.href, "/editor");
    assert.equal(motion?.href, "/motion");
  });

  it("has EN/NL i18n parity for landing keys", () => {
    for (const moduleKey of STUDIO_PRODUCT_LANDING_MODULES) {
      const config = studioProductLandingConfig(moduleKey);
      for (const key of [
        config.titleKey,
        config.descriptionKey,
        config.primaryCtaKey,
        config.positioningKey,
        ...(config.categoryKeys ?? []),
        ...(config.categoryKeys ?? []).map((k) => `${k}.desc` as typeof config.titleKey),
        ...(config.valuePropKeys ?? []),
        ...(config.durationKeys ?? []),
        ...config.featureCardKeys,
      ].filter(Boolean)) {
        assert.ok(en[key]?.length, `missing EN ${key}`);
        assert.ok(nl[key]?.length, `missing NL ${key}`);
      }
    }
  });
});
