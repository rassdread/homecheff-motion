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

  it("voice center exposes enable hint and auto-enables voice on selection", () => {
    const centerPath = join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx");
    const src = readFileSync(centerPath, "utf8");
    assert.match(src, /nog niet ingeschakeld/);
    assert.match(src, /voiceEnabled: true/);
    assert.doesNotMatch(src, /setVoiceLibraryTab/);
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

  it("voice center shows the shared preview panel and the voice tabs", () => {
    const centerPath = join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx");
    const src = readFileSync(centerPath, "utf8");
    assert.match(src, /StudioCharacterVoiceSharedPreview/);
    assert.match(src, /StudioVoiceCatalogBrowser/);
    assert.match(src, /Kies een stem/);
    assert.match(
      readFileSync(join(process.cwd(), "src/components/studio/studio-character-voice-shared-preview.tsx"), "utf8"),
      /Beluister voorbeeld/
    );
    assert.match(src, /studio\.voiceCenter\.advancedLanguageTitle/);
    assert.match(src, /studio\.voiceCenter\.sameVoiceForAllLanguages/);
    assert.match(src, /advancedLanguageOpen/);
    assert.doesNotMatch(src, /disabled=\{!voiceEnabled/);
  });

  it("puts the preview panel before the voice tabs and does not download the full catalog", () => {
    const centerPath = join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx");
    const clientPath = join(process.cwd(), "src/lib/studio-voice-library-client.ts");
    const src = readFileSync(centerPath, "utf8");
    const renderBlock = src.slice(src.indexOf("export function StudioCharacterVoiceCenter"));
    const panelIdx = renderBlock.indexOf("<StudioCharacterVoiceSharedPreview");
    const tabsIdx = renderBlock.indexOf("Kies een stem");
    assert.ok(panelIdx >= 0 && tabsIdx > panelIdx);
    assert.match(readFileSync(clientPath, "utf8"), /searchVoiceLibraryPage/);
    assert.doesNotMatch(readFileSync(clientPath, "utf8"), /scheduleFullCatalogLoad/);
  });

  it("keeps editable preview text in the shared panel", () => {
    const centerPath = join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx");
    const panelPath = join(process.cwd(), "src/components/studio/studio-character-voice-shared-preview.tsx");
    const src = readFileSync(centerPath, "utf8");
    const panel = readFileSync(panelPath, "utf8");
    assert.match(src, /previewTextInput/);
    assert.match(panel, /Voorbeeldtekst/);
    assert.match(panel, /Spreeksnelheid/);
    assert.doesNotMatch(panel, /playbackRate/);
  });

  it("compares free samples locally and copies that speed into the real preview setting", () => {
    const sample = readFileSync(join(process.cwd(), "src/lib/studio-voice-library-sample.ts"), "utf8");
    const compare = readFileSync(join(process.cwd(), "src/components/studio/studio-voice-sample-compare.tsx"), "utf8");
    const center = readFileSync(join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx"), "utf8");
    const panel = readFileSync(join(process.cwd(), "src/components/studio/studio-character-voice-shared-preview.tsx"), "utf8");
    assert.match(sample, /playbackRate/);
    assert.match(sample, /never calls a speech provider/);
    assert.match(compare, /benadering/);
    assert.match(center, /speechSpeed: meta\?\.speechSpeed/);
    assert.match(panel, /echte ElevenLabs-snelheid/);
    assert.doesNotMatch(panel, /playbackRate/);
  });

  it("persona preset cards expose preview button and requestCharacterVoicePreview", () => {
    const sectionPath = join(
      process.cwd(),
      "src/components/studio/studio-character-voice-library-section.tsx"
    );
    const src = readFileSync(sectionPath, "utf8");
    assert.match(src, /StudioVoicePersonaPresetsPanel/);
    assert.match(src, /VoicePersonaPresetCard/);
    assert.match(src, /requestCharacterVoicePreview/);
    assert.match(src, /studio\.voiceCenter\.preview/);
    assert.match(src, /VOICE_LIBRARY_ACCESS_DENIED/);
    assert.match(src, /studio\.voiceLibrary\.ttsAccessDenied/);
    const unavailableBlock = src.slice(src.indexOf("VoicePersonaPresetCard"));
    assert.match(unavailableBlock, /!canSelect/);
    assert.match(unavailableBlock, /canSelect \?/);
  });

  it("voice library API supports summary mode and client loads voices progressively", () => {
    const routePath = join(process.cwd(), "src/app/api/studio/voice-library/route.ts");
    const clientPath = join(process.cwd(), "src/lib/studio-voice-library-client.ts");
    const routeSrc = readFileSync(routePath, "utf8");
    const clientSrc = readFileSync(clientPath, "utf8");
    assert.match(routeSrc, /summary/);
    assert.match(routeSrc, /voices:\s*\[\]/);
    assert.match(clientSrc, /summary=1/);
    assert.match(clientSrc, /searchVoiceLibraryPage/);
    assert.match(routeSrc, /pageVoiceLibrary/);
    assert.doesNotMatch(clientSrc, /scheduleFullCatalogLoad/);
  });

  it("my voices tab shows discovery heading and clone workflow", () => {
    const myVoicesPath = join(process.cwd(), "src/components/studio/studio-my-voices-section.tsx");
    const src = readFileSync(myVoicesPath, "utf8");
    assert.match(src, /studio\.myVoices\.discovery/);
    assert.match(src, /StudioVoiceCloneWorkflow/);
  });

  it("uses mobile-friendly min touch targets on collapsible sections and cards", () => {
    const centerPath = join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx");
    const sectionPath = join(
      process.cwd(),
      "src/components/studio/studio-character-voice-library-section.tsx"
    );
    const collapsiblePath = join(
      process.cwd(),
      "src/components/studio/voice-center-collapsible-section.tsx"
    );
    assert.match(readFileSync(collapsiblePath, "utf8"), /min-h-\[44px\]/);
    assert.match(readFileSync(sectionPath, "utf8"), /min-h-\[44px\]/);
    assert.match(readFileSync(centerPath, "utf8"), /min-h-\[44px\]/);
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
    "studio.voiceCenter.mainVoiceTitle",
    "studio.voiceCenter.section.bestMatches",
    "studio.voiceCenter.section.library",
    "studio.voiceCenter.openLibrary",
    "studio.voiceCenter.quickPicksTitle",
    "studio.voiceCenter.showDebugOverrides",
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
    "studio.voiceCenter.previewTextAutoHint",
    "studio.voiceLibrary.loadingVoices",
  ] as const;

  it("has nl/en keys for voice library discovery surfaces", () => {
    for (const key of keys) {
      assert.ok(nl[key], `missing nl key ${key}`);
      assert.ok(en[key], `missing en key ${key}`);
    }
  });
});
