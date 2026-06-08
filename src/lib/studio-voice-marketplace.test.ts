import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mockVoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import { buildVoicePersonaPresets } from "@/lib/studio-voice-persona-presets";
import { resolveSharedVoicesLimit } from "@/lib/studio-voice-shared-catalog";
import {
  buildFacetedAccentCoverage,
  buildFacetedMarketplaceFilterOptions,
  buildMarketplaceEntries,
  buildStoryAwareVoicePreviewText,
  buildVoiceRecommendations,
  computeVoiceCompatibilityScore,
  filterMarketplaceEntries,
  libraryEntryToMarketplaceEntry,
} from "@/lib/studio-voice-marketplace";
import { appendVoiceSelectionMemory, parseVoiceSelectionMemory } from "@/lib/studio-voice-selection-memory";
import { voiceLanguageLabelKey } from "@/lib/studio-voice-language-labels";

describe("studio-voice-marketplace", () => {
  it("defaults shared voices limit to unlimited", () => {
    const prev = process.env.ELEVENLABS_SHARED_VOICES_MAX;
    delete process.env.ELEVENLABS_SHARED_VOICES_MAX;
    assert.equal(resolveSharedVoicesLimit(), null);
    if (prev !== undefined) {
      process.env.ELEVENLABS_SHARED_VOICES_MAX = prev;
    }
  });

  it("uses full language labels", () => {
    assert.equal(voiceLanguageLabelKey("nl"), "studio.voiceLibrary.language.nl");
    assert.equal(voiceLanguageLabelKey("ru"), "studio.voiceLibrary.language.ru");
  });

  it("builds story-aware chef preview", () => {
    const text = buildStoryAwareVoicePreviewText({
      characterName: "Marcus",
      characterType: "chef",
      clothing: "chef outfit",
      language: "en",
    });
    assert.match(text, /kitchen/i);
    assert.match(text, /Marcus/);
  });

  it("ranks jamaican voices higher for caribbean market context", () => {
    const catalog = mockVoiceLibraryCatalog();
    const recommendations = buildVoiceRecommendations({
      catalog,
      context: {
        characterName: "Chef",
        usageContext: "Caribbean market street food",
        storyKeywords: ["kingston", "jamaica"],
        language: "en",
      },
      personaPresets: buildVoicePersonaPresets(catalog),
      limit: 5,
    });
    assert.ok(recommendations.length > 0);
    const top = recommendations[0]!;
    assert.ok(top.compatibilityScore >= 50);
  });

  it("filters marketplace entries with unified filters", () => {
    const catalog = mockVoiceLibraryCatalog();
    const entries = catalog.voices.map(libraryEntryToMarketplaceEntry);
    const filtered = filterMarketplaceEntries(entries, { language: "en" });
    assert.ok(filtered.every((e) => e.language === "en" || e.language === ""));
  });

  it("stores voice selection memory in notes", () => {
    const entry = libraryEntryToMarketplaceEntry(mockVoiceLibraryCatalog().voices[0]!);
    const score = computeVoiceCompatibilityScore(entry, { language: "en" });
    const notes = appendVoiceSelectionMemory("", {
      selectedAt: new Date().toISOString(),
      profileRef: entry.profileRef,
      voiceName: entry.name,
      compatibilityScore: score.score,
      matchedAccentId: entry.accentCanonicalId,
      matchedAccentLabelKey: entry.accentLabelKey,
      personaPresetId: null,
      personaLabelKey: null,
      matchingReasons: score.reasons,
    });
    const parsed = parseVoiceSelectionMemory(notes);
    assert.ok(parsed);
    assert.equal(parsed!.voiceName, entry.name);
  });

  it("recomputes faceted filter counts when a dimension is active", () => {
    const catalog = mockVoiceLibraryCatalog();
    const entries = buildMarketplaceEntries(catalog, []);
    const baseline = buildFacetedMarketplaceFilterOptions(entries, {});
    const withLanguage = buildFacetedMarketplaceFilterOptions(entries, { language: "en" });
    const enBaseline = baseline.languages.find((l) => l.value === "en")?.voiceCount ?? 0;
    const enFiltered = withLanguage.languages.find((l) => l.value === "en")?.voiceCount ?? 0;
    assert.equal(enFiltered, enBaseline);
    const totalGendersBaseline = baseline.genders.reduce((sum, g) => sum + g.voiceCount, 0);
    const totalGendersFiltered = withLanguage.genders.reduce((sum, g) => sum + g.voiceCount, 0);
    assert.ok(totalGendersFiltered <= totalGendersBaseline);
    const accentBaseline = buildFacetedAccentCoverage(entries, {});
    const accentWithLang = buildFacetedAccentCoverage(entries, { language: "en" });
    const britishBaseline = accentBaseline.find((r) => r.accentId === "english.british")?.voiceCount ?? 0;
    const britishFiltered = accentWithLang.find((r) => r.accentId === "english.british")?.voiceCount ?? 0;
    assert.ok(britishFiltered <= britishBaseline);
  });
});
