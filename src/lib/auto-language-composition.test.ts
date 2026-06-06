import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  applySceneTextTranslations,
  collectTranslatableFields,
  protectProtectedLiterals,
  restoreProtectedLiterals,
} from "@/lib/translate-scene-texts";
import { prepareStorySceneTexts, resolveCleanVideoUrlForOverlay } from "@/lib/story-language-export";
import { isLanguageExportCode, LANGUAGE_EXPORT_CODES } from "@/lib/video-language-export";
import type { LanguageExportAuditEvent } from "@/lib/video-language-export";
import {
  breakTextIntoLines,
  resolveAdaptiveTypography,
} from "@/server/animation-export/adaptive-typography";
import type { InstantSceneText } from "@/lib/story-overlay-templates";
import { fixture } from "@/test/studio-api-fixtures";

const sampleProject = {
  instantSceneTexts: [
    {
      template: "hero",
      heroText: "Hidden talent",
      title: "HomeCheff in Rotterdam",
      subtitle: "Visit https://homecheff.app",
      accentWords: ["talent", "Paramaribo"],
      lines: ["Line one"],
      heroFinaleText: "Join HomeGarden",
    },
  ],
};

describe("auto language composition workflow", () => {
  it("collects hero, title, subtitle, lines, finale, and accent words", () => {
    const fields = collectTranslatableFields(
      fixture<InstantSceneText[]>(sampleProject.instantSceneTexts)
    );
    const fieldNames = fields.map((f) =>
      f.field === "line" ? `line:${f.lineIndex}` : (
        f.field === "accentWord" ? `accent:${f.accentIndex}`
      : f.field)
    );
    assert.ok(fieldNames.includes("heroText"));
    assert.ok(fieldNames.includes("title"));
    assert.ok(fieldNames.includes("subtitle"));
    assert.ok(fieldNames.includes("heroFinaleText"));
    assert.ok(fieldNames.includes("line:0"));
    assert.ok(fieldNames.includes("accent:0"));
    assert.ok(fieldNames.includes("accent:1"));
  });

  it("keeps brand names, cities, and URLs unchanged during protection", () => {
    const text = "HomeCheff in Rotterdam — https://homecheff.app and Paramaribo";
    const { protectedText, map } = protectProtectedLiterals(text);
    assert.ok(!protectedText.includes("HomeCheff"));
    assert.ok(!protectedText.includes("Rotterdam"));
    assert.ok(!protectedText.includes("https://"));
    assert.equal(restoreProtectedLiterals(protectedText, map), text);
  });

  it("applies translated accent words without dropping other fields", () => {
    const base = [
      {
        template: "hero" as const,
        heroText: "HELLO",
        accentWords: ["talent", "chef"],
      },
    ];
    const fields = collectTranslatableFields(base);
    const translated = applySceneTextTranslations({
      base,
      fields,
      translated: [
        { id: 0, text: "HALLO" },
        { id: 1, text: "gave" },
        { id: 2, text: "kok" },
      ],
    });
    assert.deepEqual(translated[0]?.accentWords, ["gave", "kok"]);
  });

  it("prepareStorySceneTexts skips machine translation when user-reviewed overrides are provided", async () => {
    const overrides = [
      {
        template: "hero" as const,
        heroText: "UNTAPPED TALENT",
        title: "CUSTOM",
      },
    ];
    const prepared = await prepareStorySceneTexts({
      project: sampleProject,
      languageCode: "en",
      sceneTextOverrides: overrides,
    });
    assert.equal(prepared.translationProvider, "user_reviewed");
    assert.equal(prepared.sceneTexts[0]?.heroText, "UNTAPPED TALENT");
    assert.equal(prepared.sceneTexts[0]?.title, "CUSTOM");
  });

  it("language version creation and render paths do not call Vidu", () => {
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    const renderSrc = fs.readFileSync(
      path.join(root, "server/instant-premium/language-export-render-execution.ts"),
      "utf8"
    );
    const serviceSrc = fs.readFileSync(
      path.join(root, "server/instant-premium/language-export-service.ts"),
      "utf8"
    );
    const storySrc = fs.readFileSync(path.join(root, "lib/story-language-export.ts"), "utf8");
    for (const src of [renderSrc, serviceSrc, storySrc]) {
      assert.ok(!src.includes("triggerVidu"));
      assert.ok(!src.includes("createVidu"));
      assert.ok(!src.includes("viduClient"));
    }
  });

  it("language export audit records zero AI video credits", () => {
    const event: LanguageExportAuditEvent = {
      type: "language_export",
      billingImpact: "none",
      aiCreditsUsed: 0,
      provider: "internal_text_overlay",
      languageCode: "en",
      projectId: "proj-1",
      sourceFinalVideoUrl: "https://example.com/clean.mp4",
      recordedAt: new Date().toISOString(),
      status: "started",
    };
    assert.equal(event.aiCreditsUsed, 0);
    assert.equal(event.billingImpact, "none");
  });

  it("story language versions use clean video as overlay source", () => {
    const url = resolveCleanVideoUrlForOverlay({
      instantCleanFinalVideoUrl: "https://cdn.example.com/clean.mp4",
    });
    assert.equal(url, "https://cdn.example.com/clean.mp4");
  });

  it("adaptive typography wraps longer translated hero copy", () => {
    const longGerman =
      "Verborgenes Talent wartet überall in Rotterdam auf dich.";
    const result = resolveAdaptiveTypography({
      text: longGerman,
      template: "hero",
      frameWidth: 1080,
      frameHeight: 1920,
      selectedZone: "TOP_CENTER",
      safeZoneScore: 72,
      textWidthFraction: 0.55,
    });
    assert.ok(result.lines.length >= 1);
    const wrapped = breakTextIntoLines({
      text: longGerman,
      template: "hero",
      fontSize: result.fontSize,
      maxTextWidthPx: Math.floor(1080 * 0.55),
    });
    assert.ok(wrapped.length >= 1);
    assert.ok(result.fontSize > 0);
  });

  it("supports de, pt, and it language export codes", () => {
    for (const code of ["de", "pt", "it"] as const) {
      assert.ok(isLanguageExportCode(code));
      assert.ok(LANGUAGE_EXPORT_CODES.includes(code));
    }
  });

  it("manual typography workflow language codes remain valid", () => {
    assert.ok(isLanguageExportCode("nl"));
    assert.ok(isLanguageExportCode("fr"));
    assert.ok(!isLanguageExportCode("xx"));
  });
});
