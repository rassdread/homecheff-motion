import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pageVoiceLibrary } from "@/lib/studio-voice-library-page";
import type { VoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";

function voice(id: string, name: string, language: string, accent: string, previewUrl = ""): VoiceLibraryCatalog["voices"][number] {
  return {
    id,
    name,
    accent,
    gender: "female",
    age: "young",
    language,
    description: `${name} sample`,
    labels: {},
    previewUrl,
    category: "premade",
  };
}

const catalog: VoiceLibraryCatalog = {
  version: 1,
  source: "mock",
  fetchedAt: "2026-10-18T00:00:00.000Z",
  voices: [
    voice("a", "Anna Baker", "en", "british", "https://example.com/anna.mp3"),
    voice("b", "Bram", "nl", "dutch"),
    voice("c", "Cara", "en", "irish", "https://example.com/cara.mp3"),
  ],
};

describe("pageVoiceLibrary", () => {
  it("returns one page and does not include voices from the next page", () => {
    const page = pageVoiceLibrary(catalog, { page: 0, pageSize: 2 });
    assert.equal(page.total, 3);
    assert.equal(page.voices.length, 2);
    assert.deepEqual(page.voices.map((entry) => entry.id), ["a", "b"]);
    const next = pageVoiceLibrary(catalog, { page: 1, pageSize: 2 });
    assert.deepEqual(next.voices.map((entry) => entry.id), ["c"]);
  });

  it("filters by language and search without calling a provider", () => {
    const english = pageVoiceLibrary(catalog, { language: "en", pageSize: 24 });
    assert.deepEqual(english.voices.map((entry) => entry.id), ["a", "c"]);
    assert.equal(english.accentCounts?.some((row) => row.value.startsWith("dutch.")), false);
    const dutch = pageVoiceLibrary(catalog, { language: "nl", pageSize: 24 });
    assert.deepEqual(dutch.accentCounts?.map((row) => row.value), ["dutch.nederlands"]);
    const found = pageVoiceLibrary(catalog, { query: "bram" });
    assert.equal(found.total, 1);
    assert.equal(found.voices[0]?.previewUrl, "");
    assert.equal(english.voices[0]?.previewUrl, "https://example.com/anna.mp3");
  });

  it("filters gender and keeps only voices with a free sample", () => {
    const sampled = pageVoiceLibrary(catalog, { gender: "female", sample: "yes" });
    assert.deepEqual(sampled.voices.map((entry) => entry.id), ["a", "c"]);
    const silent = pageVoiceLibrary(catalog, { sample: "no" });
    assert.deepEqual(silent.voices.map((entry) => entry.id), ["b"]);
  });

  it("filters a raw accent label", () => {
    const dutch = pageVoiceLibrary(catalog, { accent: "dutch" });
    assert.deepEqual(dutch.voices.map((entry) => entry.id), ["b"]);
  });

  it("merges EN and ENGLISH, keeps an unknown code, and excludes a missing language", () => {
    const mixed = pageVoiceLibrary(
      {
        ...catalog,
        voices: [
          ...catalog.voices,
          voice("d", "Diana", "ENGLISH", "american", "https://example.com/diana.mp3"),
          voice("e", "Elena", "EN", "british", "https://example.com/elena.mp3"),
          voice("f", "Filipa", "fil", "standard", "https://example.com/filipa.mp3"),
          voice("g", "Ghost", "", "american", "https://example.com/ghost.mp3"),
          voice("h", "Hugo", "es", "spanish", ""),
        ],
      },
      { language: "en", gender: "female", age: "young", sample: "yes" }
    );
    assert.deepEqual(mixed.voices.map((entry) => entry.id), ["a", "c", "d", "e"]);
    assert.equal(mixed.total, 4);
    const filipino = pageVoiceLibrary(
      {
        ...catalog,
        voices: [...catalog.voices, voice("f", "Filipa", "FIL", "", "https://example.com/filipa.mp3")],
      },
      { language: "fil" }
    );
    assert.deepEqual(filipino.voices.map((entry) => entry.id), ["f"]);
    const tagalog = pageVoiceLibrary(
      {
        ...catalog,
        voices: [voice("t", "Tala", "tl", "", "https://example.com/tala.mp3")],
      },
      { language: "fil" }
    );
    assert.equal(tagalog.total, 0);
  });

  it("combines accent, gender, age, sample, and search without duplicate pages", () => {
    const many = {
      ...catalog,
      voices: [
        voice("a", "Anna Baker", "en", "american", "https://example.com/anna.mp3"),
        voice("c", "Cara", "en", "irish", "https://example.com/cara.mp3"),
        { ...voice("m", "Mark", "en", "american", "https://example.com/mark.mp3"), gender: "male", age: "middle aged" },
        { ...voice("n", "Nora", "en", "british", "https://example.com/nora.mp3"), gender: "female", age: "middle_aged" },
        { ...voice("p", "Pablo", "es", "spanish", "https://example.com/pablo.mp3"), gender: "male" },
        { ...voice("s", "Sofia", "es", "spanish", ""), gender: "female" },
        { ...voice("sanne", "Sanne", "nl", "dutch", "https://example.com/sanne.mp3"), gender: "female" },
        { ...voice("bram2", "Bram", "nl", "dutch", ""), gender: "male" },
      ],
    };
    const englishAmerican = pageVoiceLibrary(many, {
      language: "en",
      accent: "english.american",
      gender: "female",
      age: "young",
      sample: "yes",
      query: "anna",
    });
    assert.deepEqual(englishAmerican.voices.map((entry) => entry.id), ["a"]);
    assert.equal(englishAmerican.total, 1);
    const spanishMale = pageVoiceLibrary(many, { language: "es", gender: "male", sample: "yes" });
    assert.deepEqual(spanishMale.voices.map((entry) => entry.id), ["p"]);
    const dutchFemale = pageVoiceLibrary(many, { language: "nl", gender: "female", sample: "yes" });
    assert.deepEqual(dutchFemale.voices.map((entry) => entry.id), ["sanne"]);
    const aged = pageVoiceLibrary(many, { age: "middle aged", gender: "female" });
    assert.deepEqual(aged.voices.map((entry) => entry.id), ["n"]);
    const first = pageVoiceLibrary(many, { page: 0, pageSize: 2 });
    const second = pageVoiceLibrary(many, { page: 1, pageSize: 2 });
    const firstIds = first.voices.map((entry) => entry.id);
    const secondIds = second.voices.map((entry) => entry.id);
    assert.equal(firstIds.some((id) => secondIds.includes(id)), false);
    assert.deepEqual(firstIds, ["a", "bram2"]);
  });

  it("filters category on the server page and reports language counts for the other filters", () => {
    const counted = pageVoiceLibrary(catalog, { gender: "female", sample: "yes" });
    assert.equal(counted.languageCounts.find((row) => row.value === "en")?.voiceCount, 2);
    assert.equal(counted.languageCounts.find((row) => row.value === "nl"), undefined);
    const professional = pageVoiceLibrary(
      {
        ...catalog,
        voices: catalog.voices.map((entry, index) =>
          index === 0 ? { ...entry, category: "professional" } : entry
        ),
      },
      { category: "professional" }
    );
    assert.deepEqual(professional.voices.map((entry) => entry.id), ["a"]);
  });
});
