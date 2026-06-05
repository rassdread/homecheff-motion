/**
 * Studio V38 — sound/ambience asset selection from Sound Director plan.
 */

import { getStudioAudioAsset } from "@/lib/studio-audio-asset-library";
import type { StudioAudioAsset } from "@/types/studio-audio-asset-director";
import type { SceneSoundCue } from "@/types/studio-sound-director";

const ENVIRONMENT_TO_AMBIENCE: Record<string, string> = {
  birds: "amb_birds",
  nature: "amb_birds",
  garden: "amb_birds",
  wind: "amb_light_wind",
  market: "amb_market",
  marketplace_ambience: "amb_market",
  crowd: "amb_crowd",
  conversation: "amb_crowd",
  people_talking: "amb_crowd",
  restaurant: "amb_kitchen",
  kitchen_ambience: "amb_kitchen",
  office: "amb_office",
  city: "amb_city_distant",
  street: "amb_city_distant",
  distant_traffic: "amb_city_distant",
};

const SOUND_TO_SFX: Record<string, string> = {
  footsteps: "sfx_footsteps",
  door: "sfx_door_open",
  door_knock: "sfx_door_open",
  phone: "sfx_phone_notification",
  notification: "sfx_phone_notification",
  applause: "sfx_applause",
  cooking: "sfx_cooking",
  sizzling: "sfx_cooking",
  whoosh: "sfx_whoosh",
  riser: "sfx_whoosh",
  impact: "sfx_impact",
  sweep: "sfx_whoosh",
  vehicle: "sfx_vehicle",
  engine: "sfx_vehicle",
  road_noise: "sfx_vehicle",
};

function uniqueAssets(ids: string[]): StudioAudioAsset[] {
  const seen = new Set<string>();
  const out: StudioAudioAsset[] = [];
  for (const id of ids) {
    if (seen.has(id)) {
      continue;
    }
    const asset = getStudioAudioAsset(id);
    if (asset) {
      seen.add(id);
      out.push(asset);
    }
  }
  return out;
}

function mapIds(soundIds: string[], map: Record<string, string>): string[] {
  return soundIds.map((id) => map[id]).filter((id): id is string => Boolean(id));
}

export function selectSoundAssetsForCue(cue: SceneSoundCue): {
  ambience: StudioAudioAsset[];
  sfx: StudioAudioAsset[];
} {
  const ambienceIds = [
    ...mapIds(cue.environmentSounds, ENVIRONMENT_TO_AMBIENCE),
    ...mapIds(cue.ambientRecommendation, ENVIRONMENT_TO_AMBIENCE),
  ];
  const sfxIds = [
    ...mapIds(cue.characterSounds, SOUND_TO_SFX),
    ...mapIds(cue.propSounds, SOUND_TO_SFX),
    ...mapIds(
      cue.transitionSounds.filter((t) => t !== "none"),
      SOUND_TO_SFX
    ),
  ];

  return {
    ambience: uniqueAssets(ambienceIds),
    sfx: uniqueAssets(sfxIds),
  };
}
