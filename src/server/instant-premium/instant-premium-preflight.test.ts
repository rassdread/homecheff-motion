import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CreateAnimationProjectImageInput } from "@/types/animation-api";
import {
  dedupePreflightWarnings,
  evaluateImageReport,
  INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL,
  isRenderSafeProtectionState,
  resolveImageProtectionState,
  runInstantPremiumTextPreflight,
} from "@/server/instant-premium/instant-premium-preflight";
import { derivePreflightVisionFromOcrBlocks } from "@/server/instant-premium/preflight-vision-from-ocr";

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
  /** OCR preflight tests target legacy text-reconstruction modes. */
  textRenderMode: "deevid_text_safe" as const,
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

  it("treats skipped and no_text OCR phases as render-safe", () => {
    const skipped = resolveImageProtectionState(
      baseImage({
        bakedTextProtection: {
          enabled: false,
          status: "skipped",
          userSkipped: true,
          ocrScanPhase: "skipped",
          blocks: [],
        },
      })
    );
    assert.equal(skipped.state, "ocr_skipped");
    assert.equal(isRenderSafeProtectionState(skipped.state), true);

    const noText = resolveImageProtectionState(
      baseImage({
        bakedTextProtection: {
          enabled: false,
          ocrScanPhase: "no_text_found",
          blocks: [],
        },
      })
    );
    assert.equal(noText.state, "ocr_no_text");
    assert.equal(isRenderSafeProtectionState(noText.state), true);
  });

  it("dedupes warnings by code and image index", () => {
    const messages = dedupePreflightWarnings([
      { code: "HIGH_DISTORTION_RISK", imageIndex: 0, message: "High distortion risk." },
      { code: "HIGH_DISTORTION_RISK", imageIndex: 0, message: "High distortion risk." },
      { code: "HIGH_DISTORTION_RISK", imageIndex: 1, message: "High distortion risk." },
    ]);
    assert.equal(messages.length, 2);
  });

  it("reuses OCR blocks for vision instead of requiring OpenAI", () => {
    const blocks = [
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
    const vision = derivePreflightVisionFromOcrBlocks(blocks);
    const { state, confirmed } = resolveImageProtectionState(
      baseImage({
        bakedTextProtection: {
          enabled: true,
          status: "confirmed",
          blocks,
          ocrScanPhase: "auto_protected",
        },
      })
    );
    const report = evaluateImageReport({
      index: 0,
      image: baseImage(),
      protectionState: state,
      confirmed,
      vision,
      payload: basePayload,
    });
    assert.equal(report.blocked, false);
    assert.equal(report.vision?.summary.includes("OCR"), true);
  });
});
