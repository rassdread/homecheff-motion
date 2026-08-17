import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

const STUDIO_TOOL_LABEL_KEYS = [
  "studio.tools.story",
  "studio.tools.characters",
  "studio.tools.locations",
  "studio.tools.props",
  "studio.tools.world",
  "studio.tools.voice",
  "studio.tools.music",
  "studio.tools.sound",
  "studio.tools.text",
  "studio.tools.subtitles",
  "studio.tools.translate",
  "studio.tools.export",
] as const;

const STUDIO_V2_KEY_PREFIXES = ["studio.shell.", "studio.start.", "studio.tools.", "maak."];

const NL_LEAK_WORDS_IN_EN = [
  "videoverhalen",
  "Verhaaleditor",
  "Binnenkort",
  "Personages",
  "Ondertitels",
  "Vertalen",
  "Exporteren",
  "Wat wil je",
  "Nieuw verhaal",
];

const EN_LEAK_WORDS_IN_NL = [
  "My video stories",
  "Story editor",
  "Coming soon",
  "Quick actions",
  "What do you want",
  "New video story",
  "Photos to video",
];

function studioV2Keys(locale: Record<string, string>): string[] {
  return Object.keys(locale).filter((key) =>
    STUDIO_V2_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

describe("Studio V2 i18n consistency", () => {
  it("includes Studio toolstrip labels in both locales", () => {
    for (const key of STUDIO_TOOL_LABEL_KEYS) {
      assert.ok(nl[key as keyof typeof nl]?.trim(), `missing nl: ${key}`);
      assert.ok(en[key as keyof typeof en]?.trim(), `missing en: ${key}`);
    }
  });

  it("has matching Studio V2 keys in nl and en", () => {
    const nlKeys = studioV2Keys(nl).sort();
    const enKeys = studioV2Keys(en).sort();
    assert.deepEqual(nlKeys, enKeys);
  });

  it("avoids common Dutch UI words in en Studio V2 strings", () => {
    const hits: string[] = [];
    for (const key of studioV2Keys(en)) {
      const value = en[key as keyof typeof en];
      for (const word of NL_LEAK_WORDS_IN_EN) {
        if (value.includes(word)) {
          hits.push(`${key}: ${word}`);
        }
      }
    }
    assert.deepEqual(hits, []);
  });

  it("avoids common English UI phrases in nl Studio V2 strings", () => {
    const hits: string[] = [];
    for (const key of studioV2Keys(nl)) {
      const value = nl[key as keyof typeof nl];
      for (const phrase of EN_LEAK_WORDS_IN_NL) {
        if (value.includes(phrase)) {
          hits.push(`${key}: ${phrase}`);
        }
      }
    }
    assert.deepEqual(hits, []);
  });

  it("uses canonical NL terminology for primary Studio actions", () => {
    assert.equal(nl["studio.start.newStory"], "Nieuw verhaal");
    assert.equal(nl["studio.start.myStories"], "Mijn verhalen");
    assert.equal(nl["studio.start.photosToVideo"], "Foto's naar video");
    assert.equal(nl["studio.shell.defaultTitle"], "Verhaaleditor");
    assert.equal(nl["maak.title"], "Wat wil je maken?");
  });

  it("uses canonical EN terminology for primary Studio actions", () => {
    assert.equal(en["studio.start.newStory"], "New story");
    assert.equal(en["studio.start.myStories"], "My stories");
    assert.equal(en["studio.start.photosToVideo"], "Photos to video");
    assert.equal(en["studio.shell.defaultTitle"], "Story editor");
    assert.equal(en["maak.title"], "What do you want to make?");
  });
});
