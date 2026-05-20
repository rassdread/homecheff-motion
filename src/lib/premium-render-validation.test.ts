import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPremiumRenderValidationReport } from "@/lib/premium-render-validation";
import type { InstantPremiumCreatePayload } from "@/server/instant-premium/create-instant-premium-project";

const basePayload = (): InstantPremiumCreatePayload => ({
  images: [
    { fileName: "a.jpg", previewUrl: "https://cdn.example.com/a.jpg" },
    { fileName: "b.jpg", previewUrl: "https://cdn.example.com/b.jpg" },
    { fileName: "c.jpg", previewUrl: "https://cdn.example.com/c.jpg" },
  ],
  stylePreset: "food_promo",
  duration: 8,
  aspectRatio: "9:16",
  textRenderMode: "poster_motion_preserve",
  posterMotionSettings: { version: 1, animationStyleId: "cartoon_animation" },
});

describe("premium render validation", () => {
  it("would call Vidu when valid", () => {
    const report = buildPremiumRenderValidationReport({
      payload: basePayload(),
      viduPromptChars: 1200,
      viduPromptOk: true,
    });
    assert.equal(report.ok, true);
    assert.equal(report.wouldCallVidu, true);
    assert.equal(report.textLockMode, "auto_hard_lock");
  });

  it("blocks invalid image URL", () => {
    const payload = basePayload();
    payload.images[0] = { fileName: "bad.jpg", previewUrl: "/images/foo.jpg" };
    const report = buildPremiumRenderValidationReport({
      payload,
      viduPromptChars: 1200,
      viduPromptOk: true,
    });
    assert.equal(report.ok, false);
    assert.equal(report.blockCode, "INVALID_IMAGE_URL");
    assert.equal(report.wouldCallVidu, false);
  });

  it("blocks when headline is visible but not confirmed for lock", () => {
    const payload = basePayload();
    payload.images[0] = {
      fileName: "texty.jpg",
      previewUrl: "https://cdn.example.com/t.jpg",
      bakedTextProtection: {
        enabled: true,
        status: "detected",
        blocks: [
          {
            id: "h1",
            text: "Welkom bij HomeCheff",
            editedText: "Welkom bij HomeCheff",
            confidence: 0.95,
            bbox: { x: 0.1, y: 0.08, width: 0.8, height: 0.12 },
            suggestedFontSize: 32,
            suggestedAlign: "center",
            blockType: "sign",
            kept: true,
            confirmed: false,
            animation: "none",
          },
        ],
      },
    };
    const report = buildPremiumRenderValidationReport({
      payload,
      viduPromptChars: 1200,
      viduPromptOk: true,
    });
    assert.equal(report.ok, false);
    assert.equal(report.blockCode, "TEXT_LOCK_REQUIRED");
  });
});
