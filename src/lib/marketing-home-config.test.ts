import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MARKETING_CREATE_ANYTHING_CARDS,
  MARKETING_IDEA_PIPELINE_KEYS,
  MARKETING_POPULAR_CREATION_KEYS,
} from "@/lib/marketing-home-config";
import { studioProductLandingConfig } from "@/lib/studio-product-landing-config";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";

describe("Marketing homepage config", () => {
  it("defines create-anything capability cards", () => {
    assert.equal(MARKETING_CREATE_ANYTHING_CARDS.length, 6);
  });

  it("defines idea-to-content pipeline steps", () => {
    assert.equal(MARKETING_IDEA_PIPELINE_KEYS.length, 6);
  });

  it("defines popular creation examples", () => {
    assert.equal(MARKETING_POPULAR_CREATION_KEYS.length, 6);
  });

  it("has EN/NL parity for marketing keys", () => {
    const keys = [
      "marketing.positioning.tagline",
      "marketing.createAnything.title",
      "marketing.cta.startCreating",
      ...MARKETING_CREATE_ANYTHING_CARDS.flatMap((c) => [c.titleKey, c.descKey]),
      ...MARKETING_IDEA_PIPELINE_KEYS,
      ...MARKETING_POPULAR_CREATION_KEYS,
    ];
    for (const key of keys) {
      assert.ok(en[key as keyof typeof en]?.length, `missing EN ${key}`);
      assert.ok(nl[key as keyof typeof nl]?.length, `missing NL ${key}`);
    }
  });
});

describe("Expanded product landings", () => {
  it("editor landing includes categories and value props", () => {
    const config = studioProductLandingConfig("editor");
    assert.ok((config.categoryKeys?.length ?? 0) >= 8);
    assert.ok((config.valuePropKeys?.length ?? 0) >= 4);
    assert.equal(config.primaryCtaKey, "landing.editor.primaryCta");
  });

  it("motion landing includes duration options", () => {
    const config = studioProductLandingConfig("motion");
    assert.equal(config.durationKeys?.length, 3);
  });

  it("publish landing includes voice and music features", () => {
    const config = studioProductLandingConfig("publish");
    assert.ok(config.featureCardKeys.some((k) => k.includes("voiceover")));
    assert.ok(config.featureCardKeys.some((k) => k.includes("music")));
  });

  it("studio landing positions as production hub", () => {
    const config = studioProductLandingConfig("studio");
    assert.ok(config.titleKey.includes("studio.title"));
    assert.ok((config.valuePropKeys?.length ?? 0) >= 3);
  });
});
