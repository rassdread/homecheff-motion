import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateCanonicalLanguageTextLayers,
  canonicalToLanguageTextLayerRecords,
  isTranslatableBakedBlock,
  parseLanguageTextLayersSnapshot,
} from "@/lib/canonical-language-text-layers";
import type { BakedTextBlockRecord } from "@/lib/baked-text-detection";
import { createLockedTextLayer } from "@/lib/locked-text-layer";

describe("canonical-language-text-layers", () => {
  it("includes locked layers and baked blocks from all images", () => {
    const locked = createLockedTextLayer({
      id: "lock-1",
      text: "Headline",
      x: 0.5,
      y: 0.2,
      animation: "fade-in",
      startMs: 0,
      durationMs: 8000,
    });
    const uiBlock: BakedTextBlockRecord = {
      id: "ui-1",
      text: "Buy now",
      editedText: "Buy now",
      confidence: 0.82,
      bbox: { x: 0.1, y: 0.8, width: 0.3, height: 0.08 },
      suggestedFontSize: 28,
      suggestedAlign: "center",
      blockType: "cta",
      kept: true,
      confirmed: true,
      animation: "fade-in",
    };
    const { layers, stats } = aggregateCanonicalLanguageTextLayers({
      project: {
        instantLockedTextLayers: [locked],
        instantOutputDurationSeconds: 8,
        images: [
          { order: 0, bakedTextBlocksJson: [] },
          { order: 1, bakedTextBlocksJson: [uiBlock] },
        ],
      },
    });
    assert.equal(layers.length, 2);
    assert.equal(stats.lockedCount, 1);
    assert.ok(stats.bakedOcrCount >= 1);
    const records = canonicalToLanguageTextLayerRecords(layers);
    assert.equal(records.some((r) => r.sourceText === "Buy now"), true);
  });

  it("reads persisted snapshot when present", () => {
    const snapshot = {
      version: 1 as const,
      capturedAt: new Date().toISOString(),
      recoverySource: "ocr_recovery" as const,
      layers: [
        {
          id: "p1",
          text: "Recovered",
          normalizedText: "recovered",
          boundingBox: { x: 0.5, y: 0.3, width: 0.4, height: 0.1 },
          sourceType: "ocr_recovery" as const,
          confidence: 0.9,
          locked: false,
        },
      ],
    };
    const parsed = parseLanguageTextLayersSnapshot(snapshot);
    assert.equal(parsed?.layers.length, 1);
    assert.equal(isTranslatableBakedBlock({
      id: "x",
      text: "ab",
      editedText: "ab",
      confidence: 0.4,
      bbox: { x: 0, y: 0, width: 0.1, height: 0.1 },
      suggestedFontSize: 20,
      suggestedAlign: "center",
      blockType: "cta",
      kept: true,
      confirmed: true,
      animation: "none",
    }), true);
  });
});
