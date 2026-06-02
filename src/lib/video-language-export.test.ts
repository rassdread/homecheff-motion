import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLanguageExportCode,
  languageExportLabel,
  languageFinalBlobPathname,
  MAX_LANGUAGE_EXPORTS_PER_PROJECT,
  parseLanguageTextLayerJson,
} from "@/lib/video-language-export";

describe("video-language-export", () => {
  it("caps exports per project at 6", () => {
    assert.equal(MAX_LANGUAGE_EXPORTS_PER_PROJECT, 6);
  });

  it("recognizes supported language codes", () => {
    assert.equal(isLanguageExportCode("nl"), true);
    assert.equal(isLanguageExportCode("ar"), true);
    assert.equal(isLanguageExportCode("de"), true);
    assert.equal(isLanguageExportCode("pt"), true);
    assert.equal(isLanguageExportCode("it"), true);
    assert.equal(isLanguageExportCode("xx"), false);
  });

  it("builds versioned blob paths under motion/final", () => {
    assert.equal(
      languageFinalBlobPathname("proj-1", "en", 1),
      "motion/final/proj-1/lang/en/final.mp4"
    );
    assert.equal(
      languageFinalBlobPathname("proj-1", "en", 2),
      "motion/final/proj-1/lang/en/final-v2.mp4"
    );
  });

  it("parses text layer JSON", () => {
    const layers = parseLanguageTextLayerJson([
      { id: "a", sourceText: "Hello", translatedText: "Hola", x: 0.5, y: 0.2 },
    ]);
    assert.equal(layers.length, 1);
    assert.equal(layers[0]?.translatedText, "Hola");
  });

  it("labels languages for UI", () => {
    assert.equal(languageExportLabel("nl", "en"), "Dutch");
    assert.equal(languageExportLabel("nl", "nl"), "Nederlands");
  });
});
