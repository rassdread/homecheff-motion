/**
 * S.7D — Thin workspace adapter for Music & SFX (no UI redesign).
 */

import { buildMusicStudio } from "@/lib/studio-music-studio";
import { buildStoryboardSceneMusicPlan } from "@/lib/studio-scene-music-plan";
import { buildSfxStudio, buildStoryboardSceneSoundPlan } from "@/lib/studio-sfx-studio";
import {
  recommendMusicDirection,
  recommendSoundDirection,
} from "@/lib/studio-audio-direction-guidance";
import { listStudioMusicExperiencePacks } from "@/lib/studio-music-experience-packs";
import { listStudioSfxExperiencePacks } from "@/lib/studio-sfx-experience-packs";
import { emptyBrandAudioContract, brandAudioFromKitJson } from "@/lib/studio-brand-audio";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";

export function buildWorkspaceMusicSfxEntity(input: {
  storyboard: StudioStoryboardDetail;
  musicAsset?: UserAudioLibraryAsset | null;
  sfxAsset?: UserAudioLibraryAsset | null;
  brandKitJson?: unknown;
}) {
  const musicStudio = buildMusicStudio(input.storyboard, {
    linkedAsset: input.musicAsset ?? null,
  });
  const sfxStudio = buildSfxStudio(input.storyboard, {
    linkedAsset: input.sfxAsset ?? null,
  });
  const sceneMusic = buildStoryboardSceneMusicPlan(input.storyboard);
  const sceneSound = buildStoryboardSceneSoundPlan(input.storyboard);
  const musicDirection = recommendMusicDirection({
    musicStyle: input.storyboard.musicStyle,
    musicIntensity: input.storyboard.musicIntensity,
    narrativeRole: input.storyboard.musicNarrativeRole,
  });
  const soundDirection = recommendSoundDirection({
    soundStyle: input.storyboard.soundStyle,
    soundDensity: input.storyboard.soundDensity,
  });
  const brandAudio =
    input.brandKitJson !== undefined
      ? brandAudioFromKitJson(input.brandKitJson)
      : emptyBrandAudioContract();

  return {
    version: "7d.1" as const,
    musicStudio,
    sfxStudio,
    sceneMusic,
    sceneSound,
    musicDirection,
    soundDirection,
    brandAudio,
    musicPacks: listStudioMusicExperiencePacks(),
    sfxPacks: listStudioSfxExperiencePacks(),
    redesignsWorkspace: false as const,
  };
}
