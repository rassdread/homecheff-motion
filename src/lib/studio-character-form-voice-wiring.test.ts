import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildPerLanguageVoiceOverrideOptions,
  defaultVoiceLibraryTab,
} from "@/components/studio/studio-character-voice-center";
import { mockVoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import { buildVoiceLibraryFilterOptions } from "@/lib/studio-voice-accent-model";
import { buildVoicePersonaPresets } from "@/lib/studio-voice-persona-presets";
import {
  formatClonedVoiceProfileRef,
  formatLibraryVoiceProfileRef,
} from "@/lib/studio-voice-profile-ref";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

const t = ((key: string) => nl[key as keyof typeof nl] ?? key) as (
  key: never,
  p?: Record<string, string>
) => string;

describe("studio-character-form voice library wiring", () => {
  it("wraps StudioCharacterVoiceProfilePanel with voice library providers", () => {
    const formPath = join(process.cwd(), "src/components/studio/studio-character-form.tsx");
    const src = readFileSync(formPath, "utf8");
    assert.match(src, /VoiceLibraryProvider/);
    assert.match(src, /UserVoiceLibraryProvider/);
    assert.match(src, /StudioCharacterVoiceProfilePanel/);
    assert.match(
      src,
      /<VoiceLibraryProvider>\s*\n\s*<UserVoiceLibraryProvider>\s*\n\s*<StudioCharacterVoiceProfilePanel/s
    );
  });

  it("keeps workspace inline voice providers unchanged", () => {
    const inlinePath = join(
      process.cwd(),
      "src/components/studio/studio-workspace-character-voice-inline.tsx"
    );
    const src = readFileSync(inlinePath, "utf8");
    assert.match(src, /VoiceLibraryProvider/);
    assert.match(src, /UserVoiceLibraryProvider/);
    assert.match(src, /StudioCharacterVoiceCenter/);
  });

  it("character create page uses StudioCharacterForm", () => {
    const pagePath = join(process.cwd(), "src/app/studio/characters/new/page.tsx");
    const src = readFileSync(pagePath, "utf8");
    assert.match(src, /StudioCharacterForm/);
  });

  it("character edit page uses StudioCharacterForm", () => {
    const pagePath = join(process.cwd(), "src/app/studio/characters/[id]/edit/page.tsx");
    const src = readFileSync(pagePath, "utf8");
    assert.match(src, /StudioCharacterForm/);
  });
});

describe("voice library discovery UX", () => {
  it("defaults new characters to persona/library tab instead of legacy presets", () => {
    assert.equal(defaultVoiceLibraryTab("warm_narrator"), "persona");
    assert.equal(defaultVoiceLibraryTab("documentary"), "persona");
    assert.equal(defaultVoiceLibraryTab(formatLibraryVoiceProfileRef("abc")), "persona");
    assert.equal(defaultVoiceLibraryTab(formatClonedVoiceProfileRef("clone-1")), "my_voice");
  });

  it("voice center exposes choose-voice heading and does not disable source tabs", () => {
    const centerPath = join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx");
    const src = readFileSync(centerPath, "utf8");
    assert.match(src, /studio\.voiceCenter\.chooseVoice/);
    assert.match(src, /studio\.voiceCenter\.enableToUseHint/);
    assert.match(src, /voiceEnabled: true/);
    assert.doesNotMatch(src, /disabled=\{!value\.voiceEnabled\}\s*\n\s*onClick=\{\(\) => setVoiceLibraryTab/);
  });

  it("allows voice preview without requiring voiceEnabled", () => {
    const centerPath = join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx");
    const src = readFileSync(centerPath, "utf8");
    assert.doesNotMatch(src, /if \(!value\.voiceEnabled\) \{\s*\n\s*return;\s*\n\s*\}\s*\n\s*const resolved = resolveLanguageVoice/);
    assert.match(src, /disabled=\{previewBusyLang === lang\}/);
  });

  it("library section shows unified marketplace filters and faceted counts", () => {
    const sectionPath = join(
      process.cwd(),
      "src/components/studio/studio-character-voice-library-section.tsx"
    );
    const src = readFileSync(sectionPath, "utf8");
    assert.match(src, /buildFacetedMarketplaceFilterOptions/);
    assert.match(src, /buildFacetedAccentCoverage/);
    assert.match(src, /buildFacetedCountryCoverage/);
    assert.match(src, /VoiceMarketplaceGeographyChips/);
    assert.match(src, /StudioVoiceRecommendationsPanel/);
    assert.match(src, /studio\.voiceLibrary\.activeFilters/);
    assert.match(src, /VoiceMarketplaceAccentChips/);
    assert.match(src, /VoiceLibraryBrowsePanel/);
    assert.doesNotMatch(src, /studio\.voiceLibrary\.filter\.accent/);
    assert.doesNotMatch(src, /StudioVoiceLibraryAdminAuditPanel/);
    assert.doesNotMatch(src, /disabled=\{!voiceEnabled\}/);
    assert.doesNotMatch(src, /disabled=\{!_voiceEnabled\}/);
  });

  it("voice center shows main voice, recommendations, and collapsed advanced language settings", () => {
    const centerPath = join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx");
    const src = readFileSync(centerPath, "utf8");
    assert.match(src, /studio\.voiceCenter\.mainVoiceTitle/);
    assert.match(src, /StudioVoiceRecommendationsPanel/);
    assert.match(src, /studio\.voiceCenter\.advancedLanguageTitle/);
    assert.match(src, /studio\.voiceCenter\.sameVoiceForAllLanguages/);
    assert.match(src, /advancedLanguageOpen/);
    assert.match(src, /CharacterMainVoiceCard/);
  });

  it("my voices tab shows discovery heading and clone workflow", () => {
    const myVoicesPath = join(process.cwd(), "src/components/studio/studio-my-voices-section.tsx");
    const src = readFileSync(myVoicesPath, "utf8");
    assert.match(src, /studio\.myVoices\.discovery/);
    assert.match(src, /StudioVoiceCloneWorkflow/);
  });

  it("uses mobile-friendly min touch targets on voice tabs and cards", () => {
    const centerPath = join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx");
    const sectionPath = join(
      process.cwd(),
      "src/components/studio/studio-character-voice-library-section.tsx"
    );
    assert.match(readFileSync(centerPath, "utf8"), /min-h-\[44px\].*setVoiceLibraryTab/s);
    assert.match(readFileSync(sectionPath, "utf8"), /min-h-\[44px\]/);
  });
});

describe("buildPerLanguageVoiceOverrideOptions", () => {
  const catalog = mockVoiceLibraryCatalog();
  const payload = {
    catalog,
    filterOptions: buildVoiceLibraryFilterOptions(catalog),
    personaPresets: buildVoicePersonaPresets(catalog),
  };

  it("includes legacy presets without library payload", () => {
    const options = buildPerLanguageVoiceOverrideOptions({
      lang: "en",
      t,
      payload: null,
      clones: undefined,
    });
    assert.equal(options.length, 6);
    assert.ok(options.some((o) => o.value === "warm_narrator"));
  });

  it("includes persona and library refs when payload is present", () => {
    const options = buildPerLanguageVoiceOverrideOptions({
      lang: "en",
      t,
      payload,
      clones: undefined,
    });
    assert.ok(options.length > 6);
    assert.ok(
      options.some((o) => o.value === formatLibraryVoiceProfileRef("mock-british-chef"))
    );
    assert.ok(options.some((o) => o.value.startsWith("library:")));
  });

  it("includes clone refs when user clones exist", () => {
    const options = buildPerLanguageVoiceOverrideOptions({
      lang: "en",
      t,
      payload: null,
      clones: [
        {
          cloneId: "clone-1",
          name: "My clone",
          language: "en",
          createdAt: "",
          previewUrl: "",
          status: "completed" as const,
          voiceProfileRef: formatClonedVoiceProfileRef("clone-1"),
          provider: "elevenlabs",
          characterCount: 0,
          storyboardCount: 0,
          characterIds: [],
          storyboardIds: [],
          lastUsedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    assert.ok(options.some((o) => o.value === formatClonedVoiceProfileRef("clone-1")));
  });

  it("does not throw when clone list contains empty cloneId", () => {
    assert.doesNotThrow(() =>
      buildPerLanguageVoiceOverrideOptions({
        lang: "en",
        t,
        payload: null,
        clones: [
          {
            cloneId: "",
            name: "Broken",
            language: "en",
            createdAt: "",
            lastUsedAt: "",
            previewUrl: "",
            status: "completed" as const,
            voiceProfileRef: "clone:",
            provider: "elevenlabs",
            characterCount: 0,
            storyboardCount: 0,
            characterIds: [],
            storyboardIds: [],
          },
        ],
      })
    );
  });

  it("skips invalid includeProfile refs", () => {
    const options = buildPerLanguageVoiceOverrideOptions({
      lang: "en",
      t,
      payload: null,
      clones: undefined,
      includeProfile: "library:",
    });
    assert.ok(!options.some((o) => o.value === "library:"));
  });

  it("preserves an existing override not in the default lists", () => {
    const orphanRef = formatLibraryVoiceProfileRef("unknown-voice-id");
    const options = buildPerLanguageVoiceOverrideOptions({
      lang: "en",
      t,
      payload: null,
      clones: undefined,
      includeProfile: orphanRef,
    });
    assert.ok(options.some((o) => o.value === orphanRef));
  });
});

describe("studio-character-form voice wiring i18n parity", () => {
  const keys = [
    "studio.voiceCenter.chooseVoice",
    "studio.voiceCenter.mainVoiceTitle",
    "studio.voiceCenter.advancedLanguageTitle",
    "studio.voiceCenter.sameVoiceForAllLanguages",
    "studio.voiceCenter.enableToUseHint",
    "studio.voiceCenter.browseBeforeEnableHint",
    "studio.voiceCenter.source.preset",
    "studio.voiceCenter.source.persona",
    "studio.voiceCenter.source.myVoice",
    "studio.voiceLibrary.title",
    "studio.voiceLibrary.discoverCta",
    "studio.voiceLibrary.accentSearchCta",
    "studio.voiceLibrary.filter.accent",
    "studio.myVoices.discovery",
    "studio.myVoices.empty",
  ] as const;

  it("has nl/en keys for voice library discovery surfaces", () => {
    for (const key of keys) {
      assert.ok(nl[key], `missing nl key ${key}`);
      assert.ok(en[key], `missing en key ${key}`);
    }
  });
});
