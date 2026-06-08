import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildVoiceAccentCoverageReport,
  buildVoiceLibraryStats,
  VOICE_DISCOVERY_ACCENT_IDS,
  voiceCategoryBadgeLabelKey,
} from "@/lib/studio-voice-accent-coverage";
import { buildVoiceLibraryFilterOptions, filterVoiceLibrary } from "@/lib/studio-voice-accent-model";
import { mockVoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import { buildVoicePersonaPresets } from "@/lib/studio-voice-persona-presets";

describe("studio-voice-accent-coverage", () => {
  it("reports voice counts per featured accent including zero rows", () => {
    const catalog = mockVoiceLibraryCatalog();
    const personaPresets = buildVoicePersonaPresets(catalog);
    const report = buildVoiceAccentCoverageReport({
      catalog,
      personaPresets,
      accentIds: VOICE_DISCOVERY_ACCENT_IDS,
    });

    assert.equal(report.length, VOICE_DISCOVERY_ACCENT_IDS.length);
    const british = report.find((row) => row.accentId === "english.british");
    assert.ok(british);
    assert.ok(british!.voiceCount >= 2);

    const jamaican = report.find((row) => row.accentId === "english.jamaican");
    assert.ok(jamaican);
    assert.ok(jamaican!.voiceCount >= 1);

    const australian = report.find((row) => row.accentId === "english.australian");
    assert.ok(australian);
    assert.equal(australian!.voiceCount, 0);
  });

  it("builds library stats from catalog and filters", () => {
    const catalog = mockVoiceLibraryCatalog();
    const filterOptions = buildVoiceLibraryFilterOptions(catalog);
    const personaPresets = buildVoicePersonaPresets(catalog);
    const stats = buildVoiceLibraryStats({ catalog, filterOptions, personaPresets });

    assert.equal(stats.catalogSource, "mock");
    assert.equal(stats.totalVoices, catalog.voices.length);
    assert.ok(stats.accentCount > 0);
    assert.ok(stats.languageCount > 0);
    assert.ok(stats.personaCount > 0);
  });

  it("maps category badges for premade professional shared and cloned", () => {
    assert.equal(voiceCategoryBadgeLabelKey("premade"), "studio.voiceLibrary.category.premade");
    assert.equal(
      voiceCategoryBadgeLabelKey("professional"),
      "studio.voiceLibrary.category.professional"
    );
    assert.equal(
      voiceCategoryBadgeLabelKey("high_quality"),
      "studio.voiceLibrary.category.highQuality"
    );
    assert.equal(voiceCategoryBadgeLabelKey("shared"), "studio.voiceLibrary.category.shared");
    assert.equal(voiceCategoryBadgeLabelKey("cloned"), "studio.voiceLibrary.category.cloned");
  });

  it("searches voices by accent keyword not only name", () => {
    const catalog = mockVoiceLibraryCatalog();
    const filtered = filterVoiceLibrary(catalog, { query: "jamaican" });
    assert.ok(filtered.length >= 1);
    assert.ok(
      filtered.every(
        (voice) =>
          voice.accent.toLowerCase().includes("jamaican") ||
          voice.name.toLowerCase().includes("jamaican") ||
          Object.values(voice.labels).join(" ").toLowerCase().includes("jamaican")
      )
    );
  });

  it("returns all filtered voices without a hard browse cap", () => {
    const catalog = mockVoiceLibraryCatalog();
    const filtered = filterVoiceLibrary(catalog, {});
    assert.equal(filtered.length, catalog.voices.length);
  });
});

describe("voice library browse UI cap removed", () => {
  it("does not hard-cap browse results at 48", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/studio/studio-character-voice-library-section.tsx"),
      "utf8"
    );
    assert.doesNotMatch(src, /\.slice\(0,\s*48\)/);
  });

  it("does not hard-cap per-language override options at 48", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx"),
      "utf8"
    );
    assert.doesNotMatch(src, /\.slice\(0,\s*48\)/);
  });
});
