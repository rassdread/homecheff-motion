import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { validateVoiceSettings } from "@/lib/elevenlabs-voice";
import { resolveElevenLabsVoiceId } from "@/lib/elevenlabs-voice";
import {
  formatClonedVoiceProfileRef,
  formatLibraryVoiceProfileRef,
  normalizeVoiceProfileForSynthesis,
  parseVoiceProfileRef,
  safeFormatLibraryVoiceProfileRef,
  validateVoiceProfileForSynthesis,
} from "@/lib/studio-voice-profile-ref";
import { mockVoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import { buildVoicePersonaPresets } from "@/lib/studio-voice-persona-presets";
import { synthesizeCharacterVoicePreview } from "@/server/studio/synthesize-character-voice-preview";

describe("voice library provider voice id guards", () => {
  it("parseVoiceProfileRef keeps malformed library prefix as library with empty id", () => {
    const ref = parseVoiceProfileRef("library:");
    assert.equal(ref.kind, "library");
    assert.equal(ref.providerVoiceId, "");
  });

  it("validateVoiceProfileForSynthesis rejects empty library id safely", () => {
    const result = validateVoiceProfileForSynthesis("library:");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "PROVIDER_VOICE_ID_REQUIRED");
    }
  });

  it("normalizeVoiceProfileForSynthesis preserves library ref shape", () => {
    assert.equal(normalizeVoiceProfileForSynthesis("library:voice-1"), "library:voice-1");
  });

  it("safeFormatLibraryVoiceProfileRef returns null for empty id", () => {
    assert.equal(safeFormatLibraryVoiceProfileRef(""), null);
    assert.equal(safeFormatLibraryVoiceProfileRef("  "), null);
    assert.equal(safeFormatLibraryVoiceProfileRef("voice-1"), "library:voice-1");
  });

  it("formatLibraryVoiceProfileRef throws for empty id", () => {
    assert.throws(() => formatLibraryVoiceProfileRef(""), /Provider voice id is required/);
  });

  it("validateVoiceSettings rejects library ref without provider id", () => {
    const result = validateVoiceSettings({
      voiceEnabled: true,
      voiceLanguage: "en",
      voiceProfile: "library:",
      narrationMode: "narrator",
      script: "Hello",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "PROVIDER_VOICE_ID_REQUIRED");
    }
  });

  it("resolveElevenLabsVoiceId throws for empty library ref", () => {
    assert.throws(() => resolveElevenLabsVoiceId("library:"), /Provider voice id is required/);
  });

  it("available persona and preset refs still resolve", () => {
    const catalog = mockVoiceLibraryCatalog();
    const presets = buildVoicePersonaPresets(catalog);
    const available = presets.find((p) => p.available && p.voiceId);
    assert.ok(available);
    const ref = formatLibraryVoiceProfileRef(available!.voiceId);
    assert.equal(validateVoiceProfileForSynthesis(ref).ok, true);
    assert.equal(resolveElevenLabsVoiceId(ref), available!.voiceId);
  });

  it("clone voices still validate and resolve", () => {
    const ref = formatClonedVoiceProfileRef("clone-voice-abc");
    assert.equal(validateVoiceProfileForSynthesis(ref).ok, true);
    assert.equal(resolveElevenLabsVoiceId(ref), "clone-voice-abc");
  });

  it("preset voices still validate", () => {
    assert.equal(validateVoiceProfileForSynthesis("warm_narrator").ok, true);
    assert.ok(resolveElevenLabsVoiceId("warm_narrator").length > 0);
  });

  it("synthesizeCharacterVoicePreview returns 400 for empty library ref", async () => {
    const result = await synthesizeCharacterVoicePreview({
      ownerId: "user-1",
      characterName: "Chef",
      voiceProfile: "library:",
      language: "en",
      storageAssetId: "draft-1",
      storageStoryboardId: "character-draft-user-1",
    });
    assert.equal("error" in result, true);
    if ("error" in result) {
      assert.equal(result.error.httpStatus, 400);
      assert.equal(result.error.code, "PROVIDER_VOICE_ID_REQUIRED");
    }
  });

  it("unavailable persona cards do not call formatLibraryVoiceProfileRef during render", () => {
    const sectionPath = join(
      process.cwd(),
      "src/components/studio/studio-character-voice-library-section.tsx"
    );
    const src = readFileSync(sectionPath, "utf8");
    assert.doesNotMatch(
      src,
      /formatLibraryVoiceProfileRef\(preset\.voiceId\)[\s\S]*disabled=\{!preset\.available\}/
    );
    assert.match(src, /const canSelect = preset\.available && Boolean\(preset\.voiceId\.trim\(\)\)/);
    assert.match(src, /disabled=\{!canSelect\}/);
  });

  it("voice library section uses safe format for catalog rows", () => {
    const sectionPath = join(
      process.cwd(),
      "src/components/studio/studio-character-voice-library-section.tsx"
    );
    const src = readFileSync(sectionPath, "utf8");
    assert.match(src, /safeFormatLibraryVoiceProfileRef\(voice\.id\)/);
  });
});
