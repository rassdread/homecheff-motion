/**
 * S.7D — Music & SFX Ecosystem tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMusicStudio, buildMusicIdentity } from "@/lib/studio-music-studio";
import { buildStoryboardSceneMusicPlan } from "@/lib/studio-scene-music-plan";
import { buildSfxStudio, buildStoryboardSceneSoundPlan } from "@/lib/studio-sfx-studio";
import {
  brandAudioFromKitJson,
  emptyBrandAudioContract,
} from "@/lib/studio-brand-audio";
import { listStudioMusicExperiencePacks, musicPackToOpenExperienceInput } from "@/lib/studio-music-experience-packs";
import { listStudioSfxExperiencePacks } from "@/lib/studio-sfx-experience-packs";
import {
  recommendMusicDirection,
  recommendSoundDirection,
} from "@/lib/studio-audio-direction-guidance";
import {
  organizeMusicLibrary,
  organizeSfxLibrary,
} from "@/lib/studio-audio-library-organize";
import {
  checkMusicContinuity,
  checkSfxContinuity,
} from "@/lib/studio-music-sfx-continuity";
import {
  audioSpecificationFromMusicStudio,
  audioSpecificationFromSfxStudio,
} from "@/lib/studio-music-sfx-matrix-mapping";
import { buildWorkspaceMusicSfxEntity } from "@/lib/studio-workspace-music-sfx-entity";
import { STUDIO_AUDIO_EXPERIENCE_PACK_STATUS } from "@/lib/studio-audio-director-boundary";
import {
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";

function musicAsset(partial: Partial<UserAudioLibraryAsset> & { id: string }): UserAudioLibraryAsset {
  return {
    id: partial.id,
    kind: "music",
    name: partial.name ?? "Theme",
    category: partial.category ?? "cinematic",
    mood: partial.mood ?? "warm",
    energy: partial.energy ?? "medium",
    audioUrl: partial.audioUrl ?? "https://example.com/m.mp3",
    storageKey: partial.storageKey ?? "studio/u1/audio/m.mp3",
    durationSeconds: partial.durationSeconds ?? 30,
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
  };
}

function sfxAsset(partial: Partial<UserAudioLibraryAsset> & { id: string }): UserAudioLibraryAsset {
  return {
    id: partial.id,
    kind: "sfx",
    name: partial.name ?? "Ambience",
    category: partial.category ?? "ambience",
    mood: partial.mood ?? "neutral",
    energy: partial.energy ?? "low",
    audioUrl: partial.audioUrl ?? "https://example.com/s.mp3",
    storageKey: partial.storageKey ?? "studio/u1/audio/s.mp3",
    durationSeconds: partial.durationSeconds ?? 5,
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
  };
}

describe("S.7D Music Studio + identity", () => {
  it("builds Music Studio with reusable themes", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb1",
      musicStyle: "cinematic",
      musicIntensity: "high",
      audioAssetLinks: { version: 1, musicAssetId: "m1" },
      scenes: [studioSceneDetail({ order: 0, description: "Kitchen morning" })],
    });
    const studio = buildMusicStudio(storyboard, { linkedAsset: musicAsset({ id: "m1" }) });
    assert.equal(studio.version, "7d.1");
    assert.equal(studio.identity.linkedMusicAssetId, "m1");
    assert.ok(studio.identity.themes.some((t) => t.role === "primary"));
    assert.equal(studio.reuse.reuseWithoutRegeneration, true);
    assert.equal(studio.preview.replacesFinalGeneration, false);
    assert.equal(studio.characteristics.loopBehaviour, "loop");
  });

  it("plans scene music without generating", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb1",
      audioAssetLinks: { version: 1, musicAssetId: "m1" },
      scenes: [
        studioSceneDetail({
          order: 0,
          emotion: "happy",
          musicCueType: "intro",
          musicStartBehavior: "fade_in",
        }),
      ],
    });
    const plan = buildStoryboardSceneMusicPlan(storyboard);
    assert.equal(plan.scenes[0]?.generatesImmediately, false);
    assert.equal(plan.scenes[0]?.musicThemeAssetId, "m1");
    assert.equal(plan.scenes[0]?.musicPurpose, "intro");
  });
});

describe("S.7D SFX Studio + scene sound", () => {
  it("builds SFX Studio with project bed honesty", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb1",
      audioAssetLinks: { version: 1, soundAssetId: "s1" },
      scenes: [studioSceneDetail({ order: 0 })],
    });
    const studio = buildSfxStudio(storyboard, { linkedAsset: sfxAsset({ id: "s1" }) });
    assert.equal(studio.renderSemantics, "project_bed");
    assert.equal(studio.ambienceAsSfxSubtype, true);
    assert.equal(studio.linkedSfxAssetId, "s1");
  });

  it("plans scene sound environments without timeline editor", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb1",
      scenes: [
        studioSceneDetail({
          order: 0,
          description: "Busy restaurant dining room",
          soundAmbientOverride: "chatter",
        }),
      ],
    });
    const plan = buildStoryboardSceneSoundPlan(storyboard);
    assert.equal(plan.scenes[0]?.timelineEditor, false);
    assert.equal(plan.scenes[0]?.environment, "restaurant");
  });
});

describe("S.7D packs + direction + brand + libraries", () => {
  it("maps music/sfx packs to Matrix engines", () => {
    assert.ok(listStudioMusicExperiencePacks().length >= 10);
    assert.ok(listStudioSfxExperiencePacks().length >= 8);
    const open = musicPackToOpenExperienceInput("HOMECHEFF_MUSIC");
    assert.equal(open.doorHint, "business_homecheff");
    assert.equal(STUDIO_AUDIO_EXPERIENCE_PACK_STATUS.MusicStudio, "PARTIAL");
    assert.equal(STUDIO_AUDIO_EXPERIENCE_PACK_STATUS.SfxStudio, "PARTIAL");
  });

  it("recommends direction with forced false", () => {
    const m = recommendMusicDirection({ musicStyle: "cinematic", musicIntensity: "high" });
    assert.equal(m.forced, false);
    assert.equal(m.energy, "high");
    const s = recommendSoundDirection({ soundStyle: "city", soundDensity: "dense" });
    assert.equal(s.forced, false);
    assert.equal(s.soundDensity, "dense");
  });

  it("keeps brand audio unwired", () => {
    const empty = emptyBrandAudioContract();
    assert.equal(empty.wired, false);
    assert.equal(empty.autoApply, false);
    const fromKit = brandAudioFromKitJson({ musicAssetId: "brand-m1" });
    assert.equal(fromKit.concepts.brand_theme, "brand-m1");
    assert.equal(fromKit.wired, false);
  });

  it("organizes libraries with free reuse", () => {
    const music = organizeMusicLibrary([musicAsset({ id: "m1" })], { favoriteIds: ["m1"] });
    assert.equal(music[0]?.bucket, "favorites");
    assert.equal(music[0]?.reuseWithoutCharge, true);
    const sfx = organizeSfxLibrary([sfxAsset({ id: "s1" })]);
    assert.equal(sfx[0]?.reuseWithoutCharge, true);
  });
});

describe("S.7D continuity + matrix + workspace", () => {
  it("detects music continuity and forbids regeneration semantics", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb1",
      audioAssetLinks: { version: 1, musicAssetId: "m1", soundAssetId: "s1" },
      scenes: [studioSceneDetail({ order: 0 })],
    });
    const music = checkMusicContinuity({
      storyboard,
      motionMusicAssetId: "m1",
      renderMusicAssetId: "m1",
    });
    assert.equal(music.ok, true);
    assert.equal(music.regenerationForbidden, true);
    const drift = checkMusicContinuity({
      storyboard,
      motionMusicAssetId: "other",
    });
    assert.equal(drift.driftDetected, true);
    const sfx = checkSfxContinuity({ storyboard, renderSfxAssetId: "s1" });
    assert.equal(sfx.ok, true);
  });

  it("maps studios to provider-neutral AudioSpecification", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb1",
      musicStyle: "warm",
      audioAssetLinks: { version: 1, musicAssetId: "m1", soundAssetId: "s1" },
      scenes: [studioSceneDetail({ order: 0 })],
    });
    const musicStudio = buildMusicStudio(storyboard, { linkedAsset: musicAsset({ id: "m1" }) });
    const sfxStudio = buildSfxStudio(storyboard, { linkedAsset: sfxAsset({ id: "s1" }) });
    const mSpec = audioSpecificationFromMusicStudio(musicStudio, "warm bed");
    const sSpec = audioSpecificationFromSfxStudio(sfxStudio);
    assert.equal(mSpec.capability, "MUSIC_GENERATE");
    assert.equal(sSpec.capability, "SFX_GENERATE");
    assert.equal(sSpec.sfx?.renderSemantics, "project_bed");
    assert.ok(!JSON.stringify(mSpec).includes("elevenlabs"));
  });

  it("builds workspace entity without redesign", () => {
    const storyboard = studioStoryboardDetail({
      id: "sb1",
      musicEnabled: true,
      musicStyle: "cinematic",
      scenes: [studioSceneDetail({ order: 0, description: "office lobby" })],
    });
    const entity = buildWorkspaceMusicSfxEntity({ storyboard });
    assert.equal(entity.redesignsWorkspace, false);
    assert.equal(entity.musicDirection.forced, false);
    assert.equal(entity.brandAudio.wired, false);
    assert.ok(entity.musicPacks.length > 0);
    assert.ok(buildMusicIdentity(storyboard).themes.length >= 4);
  });
});
