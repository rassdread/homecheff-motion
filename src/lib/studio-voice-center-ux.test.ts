import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { mockVoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import { buildVoicePersonaPresets } from "@/lib/studio-voice-persona-presets";
import { buildMarketplaceEntries } from "@/lib/studio-voice-marketplace";
import {
  buildVoiceQuickPicks,
  hasExplicitVoiceSelection,
  resolvePersonaGroupFromCharacterType,
} from "@/lib/studio-voice-center-ux";
import { formatLibraryVoiceProfileRef } from "@/lib/studio-voice-profile-ref";
import { formatVoiceSelectionMemory } from "@/lib/studio-voice-selection-memory";

describe("studio-voice-center-ux helpers", () => {
  it("maps character types to persona groups", () => {
    assert.equal(resolvePersonaGroupFromCharacterType("chef"), "chef");
    assert.equal(resolvePersonaGroupFromCharacterType("home gardener"), "garden");
    assert.equal(resolvePersonaGroupFromCharacterType("interior designer"), "designer");
    assert.equal(resolvePersonaGroupFromCharacterType("host"), "community");
  });

  it("detects explicit voice selection for library, clone, and selection memory", () => {
    assert.equal(
      hasExplicitVoiceSelection(formatLibraryVoiceProfileRef("mock-british-chef"), ""),
      true
    );
    assert.equal(hasExplicitVoiceSelection("warm_narrator", ""), false);
    assert.equal(
      hasExplicitVoiceSelection(
        "warm_narrator",
        formatVoiceSelectionMemory({
          selectedAt: "2026-01-01T00:00:00.000Z",
          profileRef: formatLibraryVoiceProfileRef("mock-british-chef"),
          voiceName: "Chef",
          compatibilityScore: 80,
          matchedAccentId: null,
          matchedAccentLabelKey: null,
          personaPresetId: null,
          personaLabelKey: null,
          matchingReasons: [],
        })
      ),
      true
    );
  });

  it("builds quick picks from persona and accent filters without exceeding eight", () => {
    const catalog = mockVoiceLibraryCatalog();
    const personaPresets = buildVoicePersonaPresets(catalog);
    const entries = buildMarketplaceEntries(catalog, []);
    const picks = buildVoiceQuickPicks(entries, personaPresets, 8);
    assert.ok(picks.length > 0);
    assert.ok(picks.length <= 8);
    assert.ok(picks.some((p) => p.labelKey.includes("chef") || p.labelKey.includes("british")));
  });
});

describe("voice center UX wiring", () => {
  const centerPath = join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx");
  const sectionPath = join(
    process.cwd(),
    "src/components/studio/studio-character-voice-library-section.tsx"
  );

  it("uses collapsible sections with summaries and closed-by-default library browse", () => {
    const centerSrc = readFileSync(centerPath, "utf8");
    assert.match(centerSrc, /VoiceCenterCollapsibleSection/);
    assert.match(centerSrc, /studio\.voiceCenter\.section\.bestMatches/);
    assert.match(centerSrc, /studio\.voiceCenter\.section\.personaPresets/);
    assert.match(centerSrc, /studio\.voiceCenter\.section\.library/);
    assert.match(centerSrc, /studio\.voiceCenter\.section\.myVoice/);
    assert.match(centerSrc, /libraryBrowseOpen/);
    assert.match(centerSrc, /browseOpen=\{libraryBrowseOpen\}/);
    assert.doesNotMatch(centerSrc, /setVoiceLibraryTab/);
    const sectionSrc = readFileSync(sectionPath, "utf8");
    assert.match(sectionSrc, /studio\.voiceCenter\.openLibrary/);
  });

  it("keeps selected voice card always visible before collapsible sections", () => {
    const centerSrc = readFileSync(centerPath, "utf8");
    const renderBlock = centerSrc.slice(centerSrc.indexOf("export function StudioCharacterVoiceCenter"));
    const mainIdx = renderBlock.indexOf("<CharacterMainVoiceCard");
    const collapsibleIdx = renderBlock.indexOf("<VoiceCenterCollapsibleSection");
    assert.ok(mainIdx >= 0 && collapsibleIdx > mainIdx);
  });

  it("opens best matches only when no explicit voice is chosen", () => {
    const centerSrc = readFileSync(centerPath, "utf8");
    assert.match(centerSrc, /hasExplicitVoiceSelection/);
    assert.match(centerSrc, /useState\(\(\) => !chosenVoice\)/);
  });

  it("splits preview text input from applied preview text", () => {
    const centerSrc = readFileSync(centerPath, "utf8");
    assert.match(centerSrc, /previewTextInput/);
    assert.match(centerSrc, /appliedPreviewText/);
    assert.match(centerSrc, /PREVIEW_TEXT_DEBOUNCE_MS/);
    assert.match(centerSrc, /flushPreviewText/);
    assert.match(centerSrc, /previewText=\{appliedPreviewText\}/);
    assert.doesNotMatch(centerSrc, /previewText=\{resolvedPreviewText\}/);
  });

  it("hides language override cards when same voice is enabled unless admin debug is open", () => {
    const centerSrc = readFileSync(centerPath, "utf8");
    assert.match(centerSrc, /showLanguageOverrideCards/);
    assert.match(centerSrc, /adminDebugOverridesOpen/);
    assert.match(centerSrc, /studio\.voiceCenter\.showDebugOverrides/);
    assert.match(centerSrc, /!useSameVoiceForAllLanguages \|\| \(isAdmin && adminDebugOverridesOpen\)/);
  });

  it("persona preset groups are collapsible with preferred group from character type", () => {
    const sectionSrc = readFileSync(sectionPath, "utf8");
    assert.match(sectionSrc, /PersonaPresetGroupSection/);
    assert.match(sectionSrc, /preferredGroupId/);
    assert.match(sectionSrc, /StudioVoiceQuickPicksPanel/);
    assert.match(sectionSrc, /buildVoiceQuickPicks/);
    assert.match(sectionSrc, /browseOpen/);
  });

  it("memoizes heavy voice center panels", () => {
    const sectionSrc = readFileSync(sectionPath, "utf8");
    assert.match(sectionSrc, /export const StudioVoiceRecommendationsPanel = memo/);
    assert.match(sectionSrc, /export const StudioVoicePersonaPresetsPanel = memo/);
    assert.match(sectionSrc, /export const StudioVoiceQuickPicksPanel = memo/);
    assert.match(sectionSrc, /export const StudioCharacterVoiceLibrarySection = memo/);
  });
});
