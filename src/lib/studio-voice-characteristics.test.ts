import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { classifyVoiceAccent } from "@/lib/studio-voice-accent-model";
import {
  extractVoiceCharacteristics,
  knownVoiceDescriptives,
  knownVoiceUseCases,
  normalizeVoiceConceptIds,
  rawAccentFilterValue,
  searchVoiceConcepts,
  voiceConceptById,
  voiceConceptRank,
  voiceDescriptiveLabel,
  voiceUseCaseLabel,
} from "@/lib/studio-voice-characteristics";
import {
  buildVoiceCatalogWhere,
  recommendVoiceCatalogWithClient,
  VOICE_CATALOG_PAGE_SIZE,
  type VoiceCatalogSearchClient,
} from "@/lib/studio-voice-catalog-search";
import { characteristicPageSql } from "@/server/studio/studio-voice-characteristic-query";

function types(description: string, descriptive = "") {
  return extractVoiceCharacteristics({ description, descriptive });
}

function has(description: string, concept: string, matchType: string, descriptive = "") {
  return types(description, descriptive).some((tag) => tag.concept === concept && tag.matchType === matchType);
}

describe("voice characteristic extraction", () => {
  it("labels every stored use case and descriptive value without inventing values", () => {
    assert.deepEqual(knownVoiceUseCases().sort(), [
      "advertisement",
      "characters_animation",
      "conversational",
      "entertainment_tv",
      "informative_educational",
      "narrative_story",
      "social_media",
    ]);
    assert.equal(voiceUseCaseLabel("narrative_story"), "Verhalen");
    assert.equal(voiceUseCaseLabel("characters_animation"), "Personages en animatie");
    assert.equal(knownVoiceDescriptives().length, 34);
    assert.equal(voiceDescriptiveLabel("calm"), "Rustig");
    assert.equal(voiceDescriptiveLabel("whispery"), "Fluisterend");
    assert.equal(voiceDescriptiveLabel("childish"), "Kinderlijk");
  });

  it("keeps explicit traits, roles, and genre uses apart", () => {
    assert.equal(has("A sinister voice", "sinister", "EXPLICIT_DESCRIPTION"), true);
    assert.equal(has("Perfect for sinister villains", "sinister", "EXPLICIT_DESCRIPTION"), false);
    assert.equal(has("Perfect for sinister villains", "sinister", "GENRE_ASSOCIATION"), true);
    assert.equal(has("Perfect for sinister villains", "villain", "CHARACTER_ROLE"), true);
    assert.equal(has("Perfect for horror", "horror", "EXPLICIT_DESCRIPTION"), false);
    assert.equal(has("Perfect for horror", "horror", "GENRE_ASSOCIATION"), true);
    assert.equal(has("A horror voice", "horror", "EXPLICIT_DESCRIPTION"), true);
  });

  it("does not treat negated wording or hedges as the characteristic", () => {
    assert.equal(types("Not suitable for horror").some((tag) => tag.concept === "horror"), false);
    assert.equal(types("Unlike typical deep male voices").some((tag) => tag.concept === "deep"), false);
    assert.equal(types("Clear without sounding overly dramatic").some((tag) => tag.concept === "dramatic"), false);
    assert.equal(has("A dramatic voice without sounding rushed", "dramatic", "EXPLICIT_DESCRIPTION"), true);
  });

  it("does not merge distinct concepts", () => {
    assert.equal(has("A soft voice", "whispering", "EXPLICIT_DESCRIPTION"), false);
    assert.equal(has("A whispering voice", "soft", "EXPLICIT_DESCRIPTION"), false);
    assert.equal(has("Gothic atmosphere", "horror", "EXPLICIT_DESCRIPTION"), false);
    assert.equal(has("Gothic horror", "gothic", "EXPLICIT_DESCRIPTION"), true);
    assert.equal(has("Gothic horror", "horror", "EXPLICIT_DESCRIPTION"), true);
    assert.equal(has("A sad voice", "melancholic", "EXPLICIT_DESCRIPTION"), false);
    assert.equal(has("A melancholy storyteller", "melancholic", "EXPLICIT_DESCRIPTION"), true);
    assert.equal(has("A villain", "sinister", "EXPLICIT_DESCRIPTION"), false);
    assert.equal(voiceConceptById("gothic")?.relatedParents.includes("horror"), false);
    assert.equal(voiceConceptById("whispering")?.relatedParents.includes("soft"), false);
    assert.equal(voiceConceptById("sad")?.relatedParents.includes("melancholic"), false);
    assert.equal(voiceConceptById("villain")?.relatedParents.includes("sinister"), false);
  });

  it("keeps rare roles and maps close words only as related", () => {
    assert.equal(has("An ancient vampire", "vampire", "CHARACTER_ROLE"), true);
    assert.equal(has("A scary whisper", "horror", "RELATED_DESCRIPTION"), true);
    assert.equal(has("A scary whisper", "horror", "EXPLICIT_DESCRIPTION"), false);
    assert.equal(searchVoiceConcepts("vampier").some((concept) => concept.id === "vampire"), true);
    assert.equal(searchVoiceConcepts("melancholisch").some((concept) => concept.id === "melancholic"), true);
    assert.equal(searchVoiceConcepts("fluisterend").some((concept) => concept.id === "whispering"), true);
    assert.equal(searchVoiceConcepts("gothic").some((concept) => concept.id === "gothic"), true);
    assert.equal(normalizeVoiceConceptIds(["horror", "not-a-concept", "gothic"]).join(), "horror,gothic");
  });

  it("ranks exact characteristics above related uses", () => {
    const exact = voiceConceptRank([{ concept: "horror", matchType: "EXPLICIT_DESCRIPTION" }], ["horror"], "related");
    const association = voiceConceptRank([{ concept: "horror", matchType: "GENRE_ASSOCIATION" }], ["horror"], "related");
    const scary = voiceConceptRank([{ concept: "scary", matchType: "EXPLICIT_DESCRIPTION" }], ["horror"], "related");
    assert.equal(exact.score > association.score, true);
    assert.equal(scary.matched, true);
    assert.equal(scary.score < exact.score, true);
    assert.equal(voiceConceptRank([{ concept: "horror", matchType: "GENRE_ASSOCIATION" }], ["horror"], "strict").matched, false);
    assert.equal(voiceConceptRank([{ concept: "villain", matchType: "CHARACTER_ROLE" }], ["sinister"], "related").matched, false);
    assert.equal(voiceConceptRank([{ concept: "villain", matchType: "CHARACTER_ROLE" }], ["villain"], "strict").matched, true);
    assert.equal(voiceConceptRank(
      [{ concept: "soft", matchType: "EXPLICIT_DESCRIPTION" }, { concept: "warm", matchType: "EXPLICIT_DESCRIPTION" }],
      ["soft", "warm"],
      "strict"
    ).matched, true);
  });

  it("adds a structured tag without overwriting the description", () => {
    assert.equal(has("A bright voice", "soft", "STRUCTURED", "soft"), true);
    assert.equal(has("", "whispering", "STRUCTURED", "whispery"), true);
    assert.equal(has("A robotic tone", "robot", "CHARACTER_ROLE", "robotic"), false);
  });
});

describe("voice discovery filters", () => {
  it("combines structured filters and keeps raw accents separate", () => {
    const where = buildVoiceCatalogWhere({
      language: "en",
      gender: "female",
      useCase: "narrative_story",
      descriptive: "calm",
      accent: "raw:yorkshire",
    });
    assert.equal(where.canonicalLanguage, "en");
    assert.equal(where.gender, "female");
    assert.equal(where.useCase, "narrative_story");
    assert.equal(where.descriptive, "calm");
    assert.equal(where.accentId, "");
    assert.equal(where.accentEquals, "yorkshire");
    assert.equal(classifyVoiceAccent("yorkshire"), null);
    assert.equal(classifyVoiceAccent("canadian"), null);
    assert.equal(classifyVoiceAccent("standard"), null);
    assert.equal(classifyVoiceAccent("argentinian")?.id, "spanish.latin_american");
    assert.equal(rawAccentFilterValue("raw:new york"), "new york");
    assert.equal(voiceConceptById("argentine"), null);
    assert.equal(VOICE_CATALOG_PAGE_SIZE, 24);
  });

  it("keeps recommendations on language and gender only", async () => {
    const seen: string[] = [];
    const client: VoiceCatalogSearchClient = {
      async count({ where }) {
        seen.push(`${where.gender ?? "any"}:${where.useCase ?? ""}:${where.descriptive ?? ""}`);
        return 0;
      },
      async findMany() {
        return [];
      },
      async groupBy() {
        throw new Error("recommendations should not build facets");
      },
    };
    const page = await recommendVoiceCatalogWithClient(client, {
      language: "en",
      gender: "female",
      useCase: "advertisement",
      descriptive: "calm",
      concepts: ["horror"],
      matchMode: "related",
    });
    assert.deepEqual(seen, ["female::"]);
    assert.equal(page.relaxed, false);
    assert.equal(page.pageSize, 8);
  });

  it("pages strict matches by name and related matches by score", () => {
    const where = buildVoiceCatalogWhere({ language: "en", gender: "male" });
    const strict = characteristicPageSql(where, ["horror", "gothic"], "strict", 24, 24);
    const related = characteristicPageSql(where, ["horror"], "related", 0, 24);
    const strictText = strict.strings.join(" ");
    const relatedText = related.strings.join(" ");
    assert.equal(strictText.includes("score DESC"), false);
    assert.equal(strictText.includes("EXPLICIT_DESCRIPTION"), true);
    assert.equal(relatedText.includes("score DESC"), true);
    assert.equal(related.values.includes(24), true);
    assert.equal(strict.values.includes("horror"), true);
    assert.equal(strict.values.includes("gothic"), true);
  });
});

describe("voice discovery preservation", () => {
  it("keeps favorites, samples, and paid confirmation on their existing paths", () => {
    const browser = readFileSync("src/components/studio/studio-voice-catalog-browser.tsx", "utf8");
    const sample = readFileSync("src/components/studio/studio-voice-sample-compare.tsx", "utf8");
    const charge = readFileSync("src/server/studio/voice-preview-charge-gate.ts", "utf8");
    const favorites = readFileSync("src/server/studio/studio-voice-favorites.ts", "utf8");
    assert.equal(browser.includes("StudioVoiceSampleCompare"), true);
    assert.equal(browser.includes("StudioVoiceFavoriteHeart"), true);
    assert.equal(browser.includes("safeFormatLibraryVoiceProfileRef"), true);
    assert.equal(browser.includes("Gebruik"), true);
    assert.equal(browser.includes("Stemkarakter"), true);
    assert.equal(browser.includes("Creatieve kenmerken"), true);
    assert.equal(browser.includes("Alle kenmerken"), true);
    assert.equal(browser.includes("Verwante kenmerken"), true);
    assert.equal(sample.includes("kost geen HC"), true);
    assert.equal(charge.includes("Bevestig de Studio HC-kosten"), true);
    assert.equal(favorites.includes("input.concepts"), true);
    assert.equal(favorites.includes("listStudioVoiceFavorites"), true);
  });
});
