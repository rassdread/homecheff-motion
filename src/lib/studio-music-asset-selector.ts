/**
 * Studio V38 — music asset selection from Music Director plan.
 */

import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import { getStudioAudioAsset } from "@/lib/studio-audio-asset-library";
import type { StudioAudioAsset } from "@/types/studio-audio-asset-director";
import type { SceneMusicCue } from "@/types/studio-music-director";

const PROFILE_CUE_TO_ASSET: Record<string, Record<string, string>> = {
  community: {
    intro: "music_community_intro",
    build: "music_community_intro",
    transition: "music_community_intro",
    climax: "music_inspirational_growth",
    resolution: "music_corporate_resolution",
  },
  corporate: {
    intro: "music_corporate_build",
    build: "music_corporate_build",
    transition: "music_corporate_build",
    climax: "music_inspirational_growth",
    resolution: "music_corporate_resolution",
  },
  inspirational: {
    intro: "music_inspirational_growth",
    build: "music_inspirational_growth",
    transition: "music_inspirational_growth",
    climax: "music_epic_momentum",
    resolution: "music_corporate_resolution",
  },
  documentary: {
    intro: "music_documentary_ambient",
    build: "music_documentary_ambient",
    transition: "music_documentary_ambient",
    climax: "music_inspirational_growth",
    resolution: "music_documentary_ambient",
  },
  epic: {
    intro: "music_documentary_ambient",
    build: "music_adventure_drive",
    transition: "music_adventure_drive",
    climax: "music_epic_momentum",
    resolution: "music_corporate_resolution",
  },
  cinematic: {
    intro: "music_documentary_ambient",
    build: "music_adventure_drive",
    transition: "music_adventure_drive",
    climax: "music_epic_momentum",
    resolution: "music_corporate_resolution",
  },
  social_media: {
    intro: "music_social_pulse",
    build: "music_social_pulse",
    transition: "music_social_pulse",
    climax: "music_epic_momentum",
    resolution: "music_social_pulse",
  },
  adventure: {
    intro: "music_adventure_drive",
    build: "music_adventure_drive",
    transition: "music_adventure_drive",
    climax: "music_epic_momentum",
    resolution: "music_corporate_resolution",
  },
};

const DIRECTOR_FALLBACK_PROFILE: Record<StudioDirectorProfile, string> = {
  commercial: "corporate",
  documentary: "documentary",
  cinematic: "cinematic",
  social_media: "social_media",
  storytelling: "community",
  educational: "corporate",
};

const NARRATIVE_OVERRIDES: Record<string, string> = {
  intro: "music_community_intro",
  build: "music_corporate_build",
  momentum: "music_inspirational_growth",
  peak: "music_epic_momentum",
  resolution: "music_corporate_resolution",
};

export function selectMusicAssetForCue(params: {
  cue: SceneMusicCue;
  profileId: string;
  directorProfile: StudioDirectorProfile;
  arcPhase: string;
}): StudioAudioAsset | null {
  const profileKey =
    PROFILE_CUE_TO_ASSET[params.profileId] ? params.profileId : DIRECTOR_FALLBACK_PROFILE[params.directorProfile];
  const cueMap = PROFILE_CUE_TO_ASSET[profileKey] ?? PROFILE_CUE_TO_ASSET.corporate;
  let assetId = cueMap?.[params.cue.cueType] ?? cueMap?.build;

  if (params.cue.energyTarget === "high" || params.arcPhase === "climax") {
    assetId = "music_epic_momentum";
  } else if (params.arcPhase === "resolution" || params.cue.cueType === "resolution") {
    assetId = cueMap?.resolution ?? "music_corporate_resolution";
  } else if (params.arcPhase === "opening" || params.cue.cueType === "intro") {
    assetId = cueMap?.intro ?? assetId;
  } else if (
    params.cue.narrativeLabel === "momentum" ||
    params.cue.narrativeLabel === "peak"
  ) {
    assetId = NARRATIVE_OVERRIDES[params.cue.narrativeLabel] ?? assetId;
  }

  return getStudioAudioAsset(assetId ?? "music_corporate_build");
}
