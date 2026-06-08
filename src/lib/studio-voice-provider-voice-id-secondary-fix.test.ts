import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildPerLanguageVoiceOverrideOptions } from "@/components/studio/studio-character-voice-center";
import { mockVoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import { buildVoiceLibraryFilterOptions } from "@/lib/studio-voice-accent-model";
import { buildVoicePersonaPresets } from "@/lib/studio-voice-persona-presets";
import { buildProductionBriefVoiceSuggestions } from "@/lib/studio-voice-location-suggestions";
import {
  coerceVoiceProfileForStorage,
  DEFAULT_VOICE_PROFILE_FALLBACK,
  isInvalidProviderVoiceProfileRef,
  validateVoiceProfileForSynthesis,
} from "@/lib/studio-voice-profile-ref";
import { nl } from "@/i18n/locales/nl";

const t = ((key: string) => nl[key as keyof typeof nl] ?? key) as (
  key: never,
  p?: Record<string, string>
) => string;

describe("voice provider id secondary crash guards", () => {
  it("detects invalid stored library: and clone: refs", () => {
    assert.equal(isInvalidProviderVoiceProfileRef("library:"), true);
    assert.equal(isInvalidProviderVoiceProfileRef("clone:"), true);
    assert.equal(isInvalidProviderVoiceProfileRef("library:undefined"), true);
    assert.equal(isInvalidProviderVoiceProfileRef("clone:null"), true);
    assert.equal(isInvalidProviderVoiceProfileRef("warm_narrator"), false);
    assert.equal(isInvalidProviderVoiceProfileRef("library:voice-1"), false);
  });

  it("coerceVoiceProfileForStorage falls back for invalid refs", () => {
    assert.equal(coerceVoiceProfileForStorage("library:"), DEFAULT_VOICE_PROFILE_FALLBACK);
    assert.equal(coerceVoiceProfileForStorage("library:voice-1"), "library:voice-1");
  });

  it("validateVoiceProfileForSynthesis rejects library:undefined", () => {
    const result = validateVoiceProfileForSynthesis("library:undefined");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "PROVIDER_VOICE_ID_REQUIRED");
    }
  });

  it("buildPerLanguageVoiceOverrideOptions survives empty cloneId during render", () => {
    const catalog = mockVoiceLibraryCatalog();
    const payload = {
      catalog,
      filterOptions: buildVoiceLibraryFilterOptions(catalog),
      personaPresets: buildVoicePersonaPresets(catalog),
    };
    assert.doesNotThrow(() =>
      buildPerLanguageVoiceOverrideOptions({
        lang: "en",
        t,
        payload,
        clones: [
          {
            cloneId: "",
            name: "Broken clone",
            language: "en",
            createdAt: "",
            lastUsedAt: "",
            previewUrl: "",
            status: "completed",
            voiceProfileRef: "clone:",
            provider: "elevenlabs",
            characterCount: 0,
            storyboardCount: 0,
            characterIds: [],
            storyboardIds: [],
          },
        ],
        includeProfile: "library:",
      })
    );
    const options = buildPerLanguageVoiceOverrideOptions({
      lang: "en",
      t,
      payload,
      clones: [{ cloneId: "", name: "Broken", language: "en", createdAt: "", lastUsedAt: "", previewUrl: "", status: "completed", voiceProfileRef: "clone:", provider: "elevenlabs", characterCount: 0, storyboardCount: 0, characterIds: [], storyboardIds: [] }],
      includeProfile: "library:",
    });
    assert.ok(!options.some((o) => o.value === "library:"));
    assert.ok(!options.some((o) => o.value === "clone:"));
  });

  it("production brief voice suggestions skip unavailable personas", () => {
    const suggestions = buildProductionBriefVoiceSuggestions({
      contentType: "documentary",
      idea: "Kingston street food story",
      catalog: mockVoiceLibraryCatalog(),
    });
    for (const suggestion of suggestions) {
      for (const presetId of suggestion.personaPresetIds) {
        const preset = buildVoicePersonaPresets(mockVoiceLibraryCatalog()).find((p) => p.id === presetId);
        assert.ok(preset?.available && preset.voiceId.trim());
      }
    }
  });

  it("voice center uses safe clone formatter not strict formatter in override builder", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx"),
      "utf8"
    );
    assert.match(src, /safeFormatClonedVoiceProfileRef\(clone\.cloneId\)/);
    assert.doesNotMatch(src, /formatClonedVoiceProfileRef\(clone\.cloneId\)/);
    assert.match(src, /isInvalidProviderVoiceProfileRef/);
    assert.match(src, /useDefaultVoice/);
  });

  it("persona library section uses safe formatter on select", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/studio/studio-character-voice-library-section.tsx"),
      "utf8"
    );
    assert.match(src, /safeFormatLibraryVoiceProfileRef\(preset\.voiceId\)/);
    assert.doesNotMatch(
      src,
      /formatLibraryVoiceProfileRef\(preset\.voiceId\)[\s\S]{0,120}disabled=\{!canSelect\}/
    );
  });

  it("my voices skips clones without cloneId", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/studio/studio-my-voices-section.tsx"),
      "utf8"
    );
    assert.match(src, /safeFormatClonedVoiceProfileRef\(voice\.cloneId\)/);
    assert.doesNotMatch(src, /formatClonedVoiceProfileRef\(voice\.cloneId\)/);
  });
});
