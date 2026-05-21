import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeTypographyStyleProfile,
  applyTextTransform,
  typographyRenderScale,
} from "@/lib/typography-style-profile";

describe("typography-style-profile", () => {
  it("analyzes CTA regions with uppercase and pill background", () => {
    const profile = analyzeTypographyStyleProfile({
      sourceText: "Order now",
      blockType: "cta",
      fontSize: 40,
    });
    assert.equal(profile.role, "cta");
    assert.equal(profile.textTransform, "uppercase");
    assert.equal(profile.background?.shape, "pill");
  });

  it("sets RTL direction for Arabic", () => {
    const profile = analyzeTypographyStyleProfile({
      sourceText: "مرحبا",
      languageCode: "ar",
    });
    assert.equal(profile.compositing.direction, "rtl");
    assert.equal(profile.textAlign, "right");
  });

  it("scales render quality", () => {
    assert.equal(typographyRenderScale("premium"), 2);
    assert.equal(typographyRenderScale("ultra"), 3);
  });

  it("applies text transform", () => {
    assert.equal(applyTextTransform("hello", "uppercase"), "HELLO");
  });
});
