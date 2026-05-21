import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeTypographyStyleProfile } from "@/lib/typography-style-profile";
import { smartFitTypographyText } from "@/lib/typography-smart-fit";

describe("typography-smart-fit", () => {
  it("wraps long translated lines and reduces font size", () => {
    const typography = analyzeTypographyStyleProfile({
      sourceText: "Short",
      fontSize: 48,
      blockType: "caption",
    });
    const fit = smartFitTypographyText({
      text: "This is a much longer translated marketing line that should wrap across multiple rows",
      typography,
      languageCode: "en",
      canvasWidth: 1080,
      canvasHeight: 1920,
      regionWidthNorm: 0.5,
      regionHeightNorm: 0.12,
    });
    assert.ok(fit.lines.length >= 2);
    assert.ok(fit.fontSize <= 48);
  });

  it("respects CTA minimum scale", () => {
    const typography = analyzeTypographyStyleProfile({
      sourceText: "Buy",
      blockType: "cta",
      fontSize: 56,
    });
    const fit = smartFitTypographyText({
      text: "EXTREMELY LONG CALL TO ACTION TEXT FOR TESTING OVERFLOW",
      typography,
      languageCode: "en",
      canvasWidth: 1080,
      canvasHeight: 1920,
      regionWidthNorm: 0.35,
      regionHeightNorm: 0.08,
    });
    assert.ok(fit.fontSize >= Math.round(56 * 0.7));
  });
});
