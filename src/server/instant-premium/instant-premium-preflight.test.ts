import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CreateAnimationProjectImageInput } from "@/types/animation-api";
import {
  evaluateImageReport,
  INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL,
  resolveImageProtectionState,
  runInstantPremiumTextPreflight,
} from "@/server/instant-premium/instant-premium-preflight";

const baseImage = (overrides: Partial<CreateAnimationProjectImageInput> = {}): CreateAnimationProjectImageInput => ({
  fileName: "photo.jpg",
  previewUrl: "https://example.com/photo.jpg",
  workingImageUrl: "https://example.com/photo.jpg",
  ...overrides,
});

const basePayload = {
  images: [baseImage(), baseImage(), baseImage()],
  stylePreset: "food_promo",
  duration: 8,
  aspectRatio: "9:16",
};

describe("instant premium text preflight", () => {
  it("blocks unconfirmed text blocks without vision", async () => {
    const images = [
      baseImage({
        bakedTextProtection: {
          enabled: true,
          blocks: [
            {
              id: "b1",
              text: "Sale",
              editedText: "Sale",
              confidence: 0.9,
              bbox: { x: 0.1, y: 0.1, width: 0.3, height: 0.08 },
              suggestedFontSize: 28,
              suggestedAlign: "center",
              blockType: "cta",
              kept: true,
              confirmed: false,
              animation: "fade-in",
            },
          ],
        },
      }),
      baseImage(),
      baseImage(),
    ];
    const result = await runInstantPremiumTextPreflight({ ...basePayload, images });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "TEXT_PROTECTION_REQUIRED");
      assert.equal(result.blockMessage, INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL);
    }
  });

  it("blocks readable text from vision when protection is missing", () => {
    const report = evaluateImageReport({
      index: 0,
      image: baseImage(),
      protectionState: "none",
      confirmed: [],
      vision: {
        hasReadableText: true,
        hasPhoneOrUiText: false,
        hasLogoOrBrandText: false,
        estimatedTextBlockCount: 2,
        distortionRisk: "high",
        summary: "Headline copy visible.",
      },
      payload: basePayload,
    });
    assert.equal(report.blocked, true);
    assert.equal(report.blockMessage, INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL);
  });

  it("allows confirmed blocks with matching vision risk", () => {
    const confirmed = [
      {
        id: "b1",
        text: "Menu",
        editedText: "Menu",
        confidence: 0.9,
        bbox: { x: 0.1, y: 0.1, width: 0.3, height: 0.08 },
        suggestedFontSize: 28,
        suggestedAlign: "center" as const,
        blockType: "sign" as const,
        kept: true,
        confirmed: true,
        animation: "fade-in" as const,
      },
    ];
    const { state } = resolveImageProtectionState(
      baseImage({
        bakedTextProtection: { enabled: true, status: "confirmed", blocks: confirmed },
      })
    );
    const report = evaluateImageReport({
      index: 0,
      image: baseImage(),
      protectionState: state,
      confirmed,
      vision: {
        hasReadableText: true,
        hasPhoneOrUiText: false,
        hasLogoOrBrandText: false,
        estimatedTextBlockCount: 1,
        distortionRisk: "high",
        summary: "Sign text detected.",
      },
      payload: basePayload,
    });
    assert.equal(report.blocked, false);
    assert.ok(report.warnings.some((w) => w.includes("distortion")));
  });
});
