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
});
