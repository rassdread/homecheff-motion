import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chooseAdaptiveOverlayTheme,
  defaultV2OverlayTheme,
} from "@/server/animation-export/adaptive-overlay-style";
import {
  analyzeSafeZonesFromBuffer,
  enhanceThemeForZonePlacement,
  heroFinalePlacement,
  heroPlacement,
  placementForZone,
  scenePlacement,
  sequencePlacement,
  titleLayerPlacement,
  SAFE_AREA_MARGIN_H,
  SAFE_AREA_MARGIN_V,
} from "@/server/animation-export/safe-zone-placement";
import { buildStoryOverlayAss } from "@/server/animation-export/story-text-overlay";

function parseAssPos(line: string): { x: number; y: number } {
  const match = line.match(/\\pos\((\d+),(\d+)\)/);
  assert.ok(match, `expected \\pos in dialogue: ${line.slice(0, 80)}`);
  return { x: Number.parseInt(match[1]!, 10), y: Number.parseInt(match[2]!, 10) };
}

function assertAnchorWithinSafeMargins(
  x: number,
  y: number,
  width: number,
  height: number
): void {
  assert.ok(x >= width * SAFE_AREA_MARGIN_H - 1, `x=${x} left of safe margin`);
  assert.ok(x <= width * (1 - SAFE_AREA_MARGIN_H) + 1, `x=${x} right of safe margin`);
  assert.ok(y >= height * SAFE_AREA_MARGIN_V - 1, `y=${y} above safe margin`);
  assert.ok(y <= height * (1 - SAFE_AREA_MARGIN_V) + 1, `y=${y} below safe margin`);
}

function findHeroDialogueLine(ass: string): string | undefined {
  return ass
    .split("\n")
    .find((line) => line.startsWith("Dialogue:") && line.includes("HCHeroMain"));
}

function findSubtitleDialogueLine(ass: string): string | undefined {
  return ass
    .split("\n")
    .find((line) => line.startsWith("Dialogue:") && line.includes("HCStorySubtitle"));
}

function assertTitleSubtitleGrouped(
  titlePos: { x: number; y: number },
  subtitlePos: { x: number; y: number }
): void {
  const below = subtitlePos.y > titlePos.y;
  const right = subtitlePos.y === titlePos.y && subtitlePos.x > titlePos.x;
  assert.ok(below || right, "subtitle should stay below or to the right of title");
  if (below) {
    assert.equal(subtitlePos.x, titlePos.x, "stacked subtitle should share title x");
  }
}

function makeZoneGridBuffer(width: number, height: number): Buffer {
  const channels = 4;
  const data = Buffer.alloc(width * height * channels);
  const colW = Math.floor(width / 3);
  const rowH = Math.floor(height / 3);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const col = Math.min(2, Math.floor(x / colW));
      const row = Math.min(2, Math.floor(y / rowH));
      const zoneIndex = row * 3 + col;
      const i = (y * width + x) * channels;

      if (zoneIndex === 8) {
        data[i] = 120;
        data[i + 1] = 120;
        data[i + 2] = 120;
      } else {
        const noise = ((x * 17 + y * 31 + zoneIndex * 53) % 200) + 20;
        data[i] = noise;
        data[i + 1] = 255 - noise;
        data[i + 2] = (noise * 3) % 255;
      }
      data[i + 3] = 255;
    }
  }

  return data;
}

describe("safe-zone-placement", () => {
  it("scores 9 zones from buffer", () => {
    const width = 63;
    const height = 63;
    const analysis = analyzeSafeZonesFromBuffer(makeZoneGridBuffer(width, height), width, height, 4);
    assert.equal(analysis.zones.length, 9);
    assert.ok(analysis.zones.every((z) => z.score >= 0 && z.score <= 100));
    assert.ok(["TOP_LEFT", "TOP_CENTER", "TOP_RIGHT"].includes(analysis.bestTopZone));
    assert.ok(["CENTER_LEFT", "CENTER", "CENTER_RIGHT"].includes(analysis.bestCenterZone));
    assert.ok(["BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT"].includes(analysis.bestBottomZone));
  });

  it("prefers quiet uniform zone over busy zones", () => {
    const width = 63;
    const height = 63;
    const analysis = analyzeSafeZonesFromBuffer(makeZoneGridBuffer(width, height), width, height, 4);
    const bottomRight = analysis.zones.find((z) => z.zoneId === "BOTTOM_RIGHT")!;
    const topLeft = analysis.zones.find((z) => z.zoneId === "TOP_LEFT")!;
    assert.ok(bottomRight.score > topLeft.score);
    assert.equal(analysis.bestBottomZone, "BOTTOM_RIGHT");
  });

  it("penalizes high edge density zones", () => {
    const width = 12;
    const height = 12;
    const quiet = Buffer.alloc(width * height * 4, 0);
    for (let i = 0; i < quiet.length; i += 4) {
      quiet[i] = 100;
      quiet[i + 1] = 100;
      quiet[i + 2] = 100;
      quiet[i + 3] = 255;
    }
    const busy = Buffer.from(quiet);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const v = (x + y) % 2 === 0 ? 0 : 255;
        busy[i] = v;
        busy[i + 1] = v;
        busy[i + 2] = v;
      }
    }
    const quietAnalysis = analyzeSafeZonesFromBuffer(quiet, width, height, 4);
    const busyAnalysis = analyzeSafeZonesFromBuffer(busy, width, height, 4);
    assert.ok(quietAnalysis.zones[0]!.score > busyAnalysis.zones[0]!.score);
  });

  it("selects hero, scene, and sequence placements from row winners", () => {
    const width = 63;
    const height = 63;
    const analysis = analyzeSafeZonesFromBuffer(makeZoneGridBuffer(width, height), width, height, 4);
    const hero = heroPlacement(analysis, 1080, 1920);
    const scene = scenePlacement(analysis, 1080, 1920);
    const sequence = sequencePlacement(analysis, 1080, 1920);
    assert.equal(hero.zoneId, analysis.bestTopZone);
    assert.equal(scene.zoneId, analysis.bestBottomZone);
    assert.equal(sequence.zoneId, analysis.bestCenterZone);
  });

  it("hero finale picks best hero or center zone", () => {
    const width = 63;
    const height = 63;
    const analysis = analyzeSafeZonesFromBuffer(makeZoneGridBuffer(width, height), width, height, 4);
    const finale = heroFinalePlacement(analysis, 1080, 1920);
    const topScore = analysis.zones.find((z) => z.zoneId === analysis.bestTopZone)!.score;
    const centerScore = analysis.zones.find((z) => z.zoneId === analysis.bestCenterZone)!.score;
    const expected = topScore >= centerScore ? analysis.bestTopZone : analysis.bestCenterZone;
    assert.equal(finale.zoneId, expected);
  });

  it("respects safe margins in placement anchors", () => {
    const width = 1080;
    const height = 1920;
    const placement = placementForZone("TOP_LEFT", 80, width, height);
    assert.ok(placement.anchorX >= width * SAFE_AREA_MARGIN_H);
    assert.ok(placement.anchorY >= height * SAFE_AREA_MARGIN_V);
    assert.ok(placement.anchorX <= width * (1 - SAFE_AREA_MARGIN_H));
    assert.ok(placement.anchorY <= height * (1 - SAFE_AREA_MARGIN_V));
  });

  it("uses wider text block for high-scoring zones", () => {
    assert.equal(placementForZone("CENTER", 75, 1080, 1920).textWidthFraction, 0.82);
    assert.equal(placementForZone("CENTER", 50, 1080, 1920).textWidthFraction, 0.72);
    assert.equal(placementForZone("CENTER", 30, 1080, 1920).textWidthFraction, 0.62);
  });

  it("enhances backdrop for low-scoring zones", () => {
    const base = chooseAdaptiveOverlayTheme({ luma: 120, stddev: 30, avgR: 0, avgG: 0, avgB: 0 });
    const enhanced = enhanceThemeForZonePlacement(base, 35);
    assert.equal(enhanced.useBackdrop, true);
    assert.ok(enhanced.outline >= 6);
    assert.ok(enhanced.backdropOpacity >= 0.52);
  });

  it("leaves theme unchanged for clean zones", () => {
    const base = defaultV2OverlayTheme();
    const same = enhanceThemeForZonePlacement(base, 72);
    assert.deepEqual(same, base);
  });
});

describe("buildStoryOverlayAss safe zone integration", () => {
  function mockAnalysis(): ReturnType<typeof analyzeSafeZonesFromBuffer> {
    const width = 63;
    const height = 63;
    return analyzeSafeZonesFromBuffer(makeZoneGridBuffer(width, height), width, height, 4);
  }

  it("uses safe zone hero anchor when provided", () => {
    const width = 1080;
    const height = 1920;
    const analysis = mockAnalysis();
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "hero", heroText: "QUIET ZONE HERO" }],
      durationSeconds: 5,
      width,
      height,
      safeZoneByIndex: new Map([[0, analysis]]),
    });
    const heroLine = findHeroDialogueLine(ass);
    assert.ok(heroLine, "expected hero dialogue line");
    const { x, y } = parseAssPos(heroLine!);
    assertAnchorWithinSafeMargins(x, y, width, height);
  });

  it("uses safe zone title-layer anchor when provided", () => {
    const width = 1080;
    const height = 1920;
    const analysis = mockAnalysis();
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "scene", title: "SCENE TITLE", subtitle: "SUB" }],
      durationSeconds: 5,
      width,
      height,
      safeZoneByIndex: new Map([[0, analysis]]),
    });
    const titleDialogue = ass.split("\n").find((l) => l.includes("SCENE TITLE"));
    const subDialogue = findSubtitleDialogueLine(ass);
    assert.ok(titleDialogue && subDialogue);
    const titlePos = parseAssPos(titleDialogue!);
    const subPos = parseAssPos(subDialogue!);
    assertAnchorWithinSafeMargins(titlePos.x, titlePos.y, width, height);
    assertAnchorWithinSafeMargins(subPos.x, subPos.y, width, height);
    assertTitleSubtitleGrouped(titlePos, subPos);
  });

  it("falls back to fixed placement without safe zone map", () => {
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "scene", title: "FALLBACK", subtitle: "" }],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
    });
    assert.match(ass, /\\pos\(540,/);
  });

  it("applies backdrop when zone score is low", () => {
    const analysis = mockAnalysis();
    const lowScoreZone = analysis.zones.reduce((a, b) => (a.score < b.score ? a : b));
    const forcedLow: typeof analysis = {
      ...analysis,
      bestTopZone: lowScoreZone.zoneId,
      bestBottomZone: lowScoreZone.zoneId,
      bestCenterZone: lowScoreZone.zoneId,
    };
    const ass = buildStoryOverlayAss({
      sceneTexts: [{ template: "hero", heroText: "BUSY ZONE" }],
      durationSeconds: 5,
      width: 1080,
      height: 1920,
      safeZoneByIndex: new Map([[0, forcedLow]]),
    });
    assert.match(ass, /,3,/);
  });
});
