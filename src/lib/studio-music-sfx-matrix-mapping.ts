/**
 * S.7D — Map Music/SFX Studio into AudioSpecification (Matrix-ready).
 */

import {
  emptyAudioSpecification,
  type AudioSpecification,
} from "@/lib/studio-audio-specification";
import type { StudioMusicStudioContract } from "@/lib/studio-music-studio";
import type { StudioSfxStudioContract } from "@/lib/studio-sfx-studio";

export function audioSpecificationFromMusicStudio(
  studio: StudioMusicStudioContract,
  prompt?: string | null
): AudioSpecification {
  const spec = emptyAudioSpecification("MUSIC_GENERATE", "PROJECT_MUSIC");
  spec.music = {
    assetId: studio.identity.linkedMusicAssetId,
    style: studio.characteristics.genre,
    mood: studio.characteristics.mood,
    durationSeconds: studio.characteristics.durationSeconds,
    prompt: prompt?.trim() || null,
  };
  spec.durationSeconds = studio.characteristics.durationSeconds;
  return spec;
}

export function audioSpecificationFromSfxStudio(
  studio: StudioSfxStudioContract,
  prompt?: string | null
): AudioSpecification {
  const spec = emptyAudioSpecification("SFX_GENERATE", "SCENE_SFX");
  spec.sfx = {
    assetId: studio.linkedSfxAssetId,
    category: studio.linkedAsset?.category ?? "ambience",
    prompt: prompt?.trim() || null,
    durationSeconds: studio.linkedAsset?.durationSeconds ?? null,
    renderSemantics: "project_bed",
  };
  spec.ambience = { asSfxSubtype: true, category: studio.linkedAsset?.category ?? null };
  return spec;
}
