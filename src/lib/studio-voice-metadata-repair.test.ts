import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyVoiceAccent } from "@/lib/studio-voice-accent-model";
import { inferAccentFromLocale } from "@/lib/studio-voice-locale-accent";
import {
  mapElevenLabsVoice,
  mockVoiceLibraryCatalog,
  type VoiceLibraryCatalog,
} from "@/lib/studio-voice-library-catalog";
import { resolveVoiceGeography } from "@/lib/studio-voice-geography-model";
import { filterMarketplaceEntries } from "@/lib/studio-voice-marketplace";
import {
  applyVoiceMetadataRepair,
  buildPersonaRecoveryAudit,
  buildVoiceMetadataCoverageSnapshot,
  buildVoiceMetadataRepairReport,
  collectVoiceMetadataRepairCandidates,
  METADATA_REPAIR_CONFIDENCE,
  voiceHadMetadataRepair,
} from "@/lib/studio-voice-metadata-repair";

describe("studio-voice-metadata-repair", () => {
  it("maps global locale accents including Caribbean and African English", () => {
    assert.equal(inferAccentFromLocale("en-JM"), "jamaican");
    assert.equal(inferAccentFromLocale("nl-SR"), "surinamese");
    assert.equal(inferAccentFromLocale("nl-BE"), "flemish");
    assert.equal(inferAccentFromLocale("en-NG"), "nigerian");
    assert.equal(inferAccentFromLocale("en-TT"), "trinidadian");
    assert.equal(inferAccentFromLocale("en-GY"), "guyanese");
    assert.equal(inferAccentFromLocale("en-GH"), "ghanaian");
  });

  it("repairs standard accent from verified locale at 95% confidence", () => {
    const voice = mapElevenLabsVoice({
      voice_id: "repair-jm",
      name: "Island Host",
      labels: { accent: "standard", language: "en" },
      verified_languages: [{ language: "en", locale: "en-JM", accent: null }],
    });
    assert.ok(voice);
    assert.equal(voice!.accent, "jamaican");
    assert.equal(classifyVoiceAccent(voice!.accent)?.id, "english.jamaican");
    assert.equal(voice!.labels._repair_accent_source, "verified_language_match");
    assert.equal(voice!.labels._repair_accent_confidence, "95");
    assert.equal(resolveVoiceGeography(voice!).countryId, "jamaica");
  });

  it("repairs surinamese Dutch from nl-SR locale", () => {
    const voice = mapElevenLabsVoice({
      voice_id: "repair-sr",
      name: "Paramaribo Voice",
      labels: { accent: "standard", language: "nl" },
      verified_languages: [{ language: "nl", locale: "nl-SR", accent: null }],
    });
    assert.ok(voice);
    assert.equal(classifyVoiceAccent(voice!.accent)?.id, "dutch.surinaams");
    assert.equal(resolveVoiceGeography(voice!).countryId, "suriname");
  });

  it("repairs flemish from nl-BE when provider accent is standard", () => {
    const voice = mapElevenLabsVoice({
      voice_id: "repair-be",
      name: "Antwerp Narrator",
      labels: { accent: "standard", language: "nl" },
      verified_languages: [{ language: "nl", locale: "nl-BE", accent: null }],
    });
    assert.ok(voice);
    assert.equal(classifyVoiceAccent(voice!.accent)?.id, "dutch.vlaams");
    assert.equal(resolveVoiceGeography(voice!).countryId, "belgium");
  });

  it("repairs nigerian from description when accent missing", () => {
    const voice = mapElevenLabsVoice({
      voice_id: "repair-ng",
      name: "Market Vendor",
      labels: { language: "en" },
      description: "Warm Nigerian English voice for Lagos market stories.",
      category: "shared",
    });
    assert.ok(voice);
    assert.equal(classifyVoiceAccent(voice!.accent)?.id, "english.nigerian");
    assert.equal(voice!.labels._repair_accent_source, "description_match");
    assert.equal(voice!.labels._repair_accent_confidence, "80");
  });

  it("records repair confidence tiers", () => {
    const candidates = collectVoiceMetadataRepairCandidates({
      voice: {
        id: "x",
        name: "Jamaican Chef Marcus",
        accent: "standard",
        gender: "",
        age: "",
        language: "en",
        description: "",
        labels: { accent: "standard", language: "en" },
        previewUrl: "",
        category: "shared",
      },
      row: {
        voice_id: "x",
        name: "Jamaican Chef Marcus",
        labels: { accent: "standard", language: "en" },
      },
    });
    const nameMatch = candidates.find(
      (c) => c.field === "accent" && c.source === "name_match"
    );
    assert.ok(nameMatch);
    assert.equal(nameMatch!.confidence, METADATA_REPAIR_CONFIDENCE.name_match);
  });

  it("filters marketplace by repaired suriname geography", () => {
    const catalog: VoiceLibraryCatalog = {
      version: 1,
      source: "elevenlabs",
      fetchedAt: new Date().toISOString(),
      voices: [
        mapElevenLabsVoice({
          voice_id: "sr-filter",
          name: "Asha",
          labels: { accent: "standard", language: "nl", gender: "female", age: "young" },
          verified_languages: [{ language: "nl", locale: "nl-SR", accent: null }],
          category: "shared",
        })!,
      ],
    };

    const entries = catalog.voices.map((v) => ({
      kind: "library" as const,
      id: v.id,
      profileRef: `library:${v.id}`,
      name: v.name,
      accent: v.accent,
      accentCanonicalId: classifyVoiceAccent(v.accent)?.id ?? null,
      accentLabelKey: null,
      language: v.language,
      gender: v.gender,
      age: v.age,
      category: v.category,
      description: v.description,
      previewUrl: v.previewUrl,
      provider: "elevenlabs" as const,
      isMyVoice: false,
      geography: resolveVoiceGeography(v),
      accessTier: "marketplace" as const,
      libraryVoice: v,
    }));

    const filtered = filterMarketplaceEntries(entries, {
      countryId: "suriname",
      language: "nl",
      gender: "female",
    });
    assert.equal(filtered.length, 1);
  });

  it("builds coverage and persona recovery audit on mock catalog", () => {
    const catalog = mockVoiceLibraryCatalog();
    const coverage = buildVoiceMetadataCoverageSnapshot(catalog);
    assert.ok(coverage.totalVoices >= 18);
    assert.ok(coverage.withCanonicalAccent >= 10);

    const report = buildVoiceMetadataRepairReport(catalog);
    assert.equal(report.catalogSource, "mock");
    assert.ok(report.accentRegistry.length > 0);
    assert.ok(report.personaRecovery.afterAvailable >= report.personaRecovery.beforeAvailable);
  });

  it("applyVoiceMetadataRepair marks repaired voices", () => {
    const base = mapElevenLabsVoice({
      voice_id: "plain",
      name: "Plain",
      labels: { accent: "american", language: "en" },
    })!;
    const repaired = applyVoiceMetadataRepair(
      { ...base, accent: "standard", labels: { ...base.labels, accent: "standard" } },
      {
        voice_id: "plain",
        verified_languages: [{ language: "en", locale: "en-JM", accent: null }],
      }
    );
    assert.equal(voiceHadMetadataRepair(repaired), true);
  });
});
