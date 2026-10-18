import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  pageFavoriteRows,
  setVoiceFavoriteWithStore,
  type VoiceFavoriteRow,
  type VoiceFavoriteStore,
} from "@/lib/studio-voice-favorites";
import { equivalentAccentForLocale, suppressedAccentIds } from "@/lib/studio-voice-filter-presentation";

function memoryStore(): VoiceFavoriteStore & { rows: VoiceFavoriteRow[] } {
  const rows: VoiceFavoriteRow[] = [];
  return {
    rows,
    async list(userId) {
      return rows.filter((row) => row.userId === userId);
    },
    async add(row) {
      const exists = rows.some((item) => item.userId === row.userId && item.provider === row.provider && item.providerVoiceId === row.providerVoiceId);
      if (!exists) {
        rows.push({ ...row, createdAt: new Date(Date.now() + rows.length) });
      }
    },
    async remove(row) {
      const index = rows.findIndex((item) => item.userId === row.userId && item.provider === row.provider && item.providerVoiceId === row.providerVoiceId);
      if (index >= 0) rows.splice(index, 1);
    },
  };
}

describe("voice favorites", () => {
  it("adds, ignores a duplicate, removes, and keeps accounts separate", async () => {
    const store = memoryStore();
    assert.equal(await setVoiceFavoriteWithStore(store, { userId: "baker-owner", providerVoiceId: "voice-1", favorite: true }), "added");
    assert.equal(await setVoiceFavoriteWithStore(store, { userId: "baker-owner", providerVoiceId: "voice-1", favorite: true }), "added");
    assert.equal(store.rows.length, 1);
    assert.equal(await setVoiceFavoriteWithStore(store, { userId: "other-owner", providerVoiceId: "voice-1", favorite: true }), "added");
    assert.equal((await store.list("baker-owner")).length, 1);
    assert.equal((await store.list("other-owner")).length, 1);
    assert.equal(await setVoiceFavoriteWithStore(store, { userId: "baker-owner", providerVoiceId: "voice-1", favorite: false }), "removed");
    assert.equal((await store.list("baker-owner")).length, 0);
    assert.equal((await store.list("other-owner")).length, 1);
    assert.equal(await setVoiceFavoriteWithStore(store, { userId: "baker-owner", providerVoiceId: "bad id", favorite: true }), "invalid");
  });

  it("pages favorites without repeating ids", () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({
      userId: "owner",
      provider: "elevenlabs",
      providerVoiceId: `voice-${index}`,
      createdAt: new Date(index * 1000),
    }));
    const first = pageFavoriteRows(rows, 0, 24);
    const second = pageFavoriteRows(rows, 1, 24);
    assert.equal(first.rows.length, 24);
    assert.equal(second.rows.length, 6);
    const overlap = first.rows.filter((row) => second.rows.some((next) => next.providerVoiceId === row.providerVoiceId));
    assert.equal(overlap.length, 0);
  });

  it("hides a regional accent only when it is the same stored locale", () => {
    assert.equal(equivalentAccentForLocale("en-US"), "english.american");
    assert.equal(equivalentAccentForLocale("es-MX"), "");
    const selected = suppressedAccentIds({
      selectedLocale: "en-US",
      pairs: [
        { accentId: "english.american", locale: "en-US", voiceCount: 10 },
        { accentId: "german.standard", locale: "en-US", voiceCount: 2 },
      ],
    });
    assert.equal(selected.includes("english.american"), true);
    assert.equal(selected.includes("german.standard"), false);
    const mixed = suppressedAccentIds({
      pairs: [
        { accentId: "english.american", locale: "en-US", voiceCount: 10 },
        { accentId: "english.american", locale: "en-GB", voiceCount: 1 },
      ],
    });
    assert.equal(mixed.includes("english.american"), false);
    const exact = suppressedAccentIds({
      pairs: [{ accentId: "english.american", locale: "en-US", voiceCount: 10 }],
    });
    assert.equal(exact.includes("english.american"), true);
    assert.equal(suppressedAccentIds({
      pairs: [{ accentId: "spanish.latin_american", locale: "es-MX", voiceCount: 4 }],
    }).includes("spanish.latin_american"), false);
  });

  it("keeps the favorite control separate from voice selection", () => {
    const heart = readFileSync("src/components/studio/studio-voice-favorite-heart.tsx", "utf8");
    const center = readFileSync("src/components/studio/studio-character-voice-center.tsx", "utf8");
    assert.match(heart, /stopPropagation/);
    assert.match(heart, /Bewaar als favoriet/);
    assert.match(center, /Favorieten/);
    assert.match(center, /Je hebt nog geen favoriete stemmen|collection=\{voicePickerTab === "favorites"/);
    assert.doesNotMatch(heart, /requestCharacterVoicePreview|speechSpeed/);
  });
});
