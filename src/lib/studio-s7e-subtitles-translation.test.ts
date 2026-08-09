/**
 * S.7E — Subtitles & Translation foundation tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSubtitleStudio } from "@/lib/studio-subtitle-studio";
import { resolveSubtitleSpeakerIdentity } from "@/lib/studio-subtitle-identity";
import { normalizeStudioSubtitleStyle } from "@/lib/studio-subtitle-style";
import { buildTranslationStudio } from "@/lib/studio-translation-studio";
import { buildLanguageIdentity } from "@/lib/studio-language-identity";
import { buildLocalizationPlan } from "@/lib/studio-localization";
import { listStudioSubtitleExperiencePacks } from "@/lib/studio-subtitle-experience-packs";
import { listStudioTranslationExperiencePacks } from "@/lib/studio-translation-experience-packs";
import {
  organizeSubtitleLibraryEntries,
  organizeTranslationLibraryEntries,
} from "@/lib/studio-language-library-organize";
import {
  recommendSubtitleDirection,
  recommendTranslationDirection,
} from "@/lib/studio-subtitle-translation-direction";
import {
  audioSpecificationFromSubtitleStudio,
  audioSpecificationFromTranslationStudio,
} from "@/lib/studio-subtitle-translate-matrix-mapping";
import { checkSubtitleLanguageContinuity } from "@/lib/studio-subtitle-translate-continuity";
import { buildWorkspaceSubtitleTranslateEntity } from "@/lib/studio-workspace-subtitle-translate-entity";
import { STUDIO_AUDIO_NOT_IMPLEMENTED } from "@/lib/studio-audio-ownership";

describe("S.7E Subtitle Studio", () => {
  it("builds subtitle studio with styles and accessibility metadata", () => {
    const studio = buildSubtitleStudio({
      storyboardId: "sb1",
      tracks: [
        {
          language: "en",
          status: "ready",
          entries: [{ start: 0, end: 1, text: "Hello" }],
          speakerLabels: ["Chef", "Narrator"],
        },
      ],
      style: "accessibility",
      burnInMode: "burn_in",
    });
    assert.equal(studio.version, "7e.1");
    assert.equal(studio.style, "accessibility");
    assert.equal(studio.accessibility.closedCaptions, true);
    assert.equal(studio.reuse.reuseWithoutRegeneration, true);
    assert.equal(studio.futureCompatibility.dubbing, "NOT_IMPLEMENTED");
    assert.equal(studio.burnInLimitation, "fixed_ass_studio_narration");
  });

  it("resolves speaker identity without duplicating Character SoT", () => {
    const character = resolveSubtitleSpeakerIdentity({
      characterId: "c1",
      characterName: "Chef",
    });
    assert.equal(character.kind, "character");
    const narrator = resolveSubtitleSpeakerIdentity({ isNarrator: true });
    assert.equal(narrator.kind, "narrator");
  });
});

describe("S.7E Translation + localization + language identity", () => {
  it("builds translation studio as overlay_export not dubbing", () => {
    const studio = buildTranslationStudio({
      sourceLanguage: "en",
      targetLanguage: "nl",
      quality: "brand_safe",
      reviewStatus: "approved",
    });
    assert.equal(studio.mode, "overlay_export");
    assert.equal(studio.isDubbing, false);
    assert.equal(studio.isLipSync, false);
    assert.equal(studio.quality, "brand_safe");
  });

  it("builds language identity and localization surfaces", () => {
    const lang = buildLanguageIdentity({
      voiceLanguage: "en",
      subtitleLanguage: "en",
      exportLanguages: ["nl", "de"],
      preferredExportLanguage: "nl",
    });
    assert.equal(lang.primaryLanguage, "en");
    assert.deepEqual(lang.secondaryLanguages, ["nl", "de"]);
    const loc = buildLocalizationPlan({ sourceLanguage: "en", targetLanguage: "nl" });
    assert.equal(loc.coupling.dubbing, "NOT_IMPLEMENTED");
    assert.ok(loc.surfaces.some((s) => s.surface === "titles" && s.implemented));
    assert.ok(loc.surfaces.some((s) => s.surface === "future_dubbing" && !s.implemented));
  });
});

describe("S.7E packs + libraries + direction + matrix", () => {
  it("lists subtitle and translation packs mapped to Matrix", () => {
    assert.ok(listStudioSubtitleExperiencePacks().length >= 8);
    assert.ok(listStudioTranslationExperiencePacks().length >= 6);
    assert.equal(
      listStudioSubtitleExperiencePacks()[0]?.matrixExperienceId,
      "SUBTITLE_TRANSCRIBE"
    );
  });

  it("organizes libraries with free reuse", () => {
    const subs = organizeSubtitleLibraryEntries([
      { id: "1", language: "en", label: "EN", favorite: true },
    ]);
    assert.equal(subs[0]?.bucket, "favorite");
    assert.equal(subs[0]?.reuseWithoutCharge, true);
    const tr = organizeTranslationLibraryEntries([
      { id: "2", language: "nl", label: "NL", brandApproved: true },
    ]);
    assert.equal(tr[0]?.bucket, "brand_approved");
  });

  it("recommends with forced false and maps to AudioSpecification", () => {
    assert.equal(recommendSubtitleDirection({ style: "social" }).forced, false);
    assert.equal(recommendTranslationDirection({ quality: "formal" }).forced, false);
    const sub = buildSubtitleStudio({
      storyboardId: "sb1",
      tracks: [{ language: "en", status: "draft", entries: [] }],
      burnInMode: "metadata_only",
    });
    const tr = buildTranslationStudio({ sourceLanguage: "en", targetLanguage: "fr" });
    const sSpec = audioSpecificationFromSubtitleStudio(sub);
    const tSpec = audioSpecificationFromTranslationStudio(tr);
    assert.equal(sSpec.capability, "SUBTITLE_TRANSCRIBE");
    assert.equal(tSpec.translationIntent?.mode, "overlay_export");
    assert.ok(!JSON.stringify(sSpec).includes("elevenlabs"));
  });
});

describe("S.7E continuity + workspace + honesty", () => {
  it("checks subtitle language continuity", () => {
    const ok = checkSubtitleLanguageContinuity({
      storyboardLanguage: "en",
      motionLanguage: "en",
      renderLanguage: "en",
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.regenerationForbidden, true);
    const drift = checkSubtitleLanguageContinuity({
      storyboardLanguage: "en",
      motionLanguage: "nl",
    });
    assert.equal(drift.driftDetected, true);
  });

  it("builds workspace entity without redesign", () => {
    const entity = buildWorkspaceSubtitleTranslateEntity({
      storyboardId: "sb1",
      voiceLanguage: "en",
      targetLanguage: "nl",
      subtitleStyle: "documentary",
    });
    assert.equal(entity.redesignsWorkspace, false);
    assert.equal(entity.translationStudio.isDubbing, false);
    assert.equal(normalizeStudioSubtitleStyle("Cinema"), "cinema");
    assert.equal(STUDIO_AUDIO_NOT_IMPLEMENTED.DUBBING, "NOT_IMPLEMENTED");
    assert.equal(STUDIO_AUDIO_NOT_IMPLEMENTED.AI_LIPSYNC, "NOT_IMPLEMENTED");
  });
});
