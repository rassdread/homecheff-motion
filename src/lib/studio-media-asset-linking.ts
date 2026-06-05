/**
 * Studio V40 — character and location asset linking through registry.
 */

import { resolveCharacterVoiceIdentity } from "@/lib/studio-voice-identity-resolver";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { selectMusicAssetForCue } from "@/lib/studio-music-asset-selector";
import { getStudioAudioAsset } from "@/lib/studio-audio-asset-library";
import {
  characterMouthAssets,
  characterReferenceImageAsset,
  locationReferenceImageAsset,
  studioAssetId,
} from "@/lib/studio-media-asset-registry";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioStoryboardDetail,
} from "@/types/studio-api";
import type { SceneMusicCue } from "@/types/studio-music-director";
import type {
  CharacterAssetBundle,
  LocationAssetBundle,
  StudioAsset,
  StudioAssetLink,
} from "@/types/studio-media-asset";

function link(assetId: string, role: string, label?: string): StudioAssetLink {
  return { assetId, role, label };
}

export function resolveCharacterLinkedAssets(
  character: StudioCharacterListItem,
  language: string
): CharacterAssetBundle {
  const referenceImages: StudioAssetLink[] = [];
  const ref = characterReferenceImageAsset(character);
  if (ref) {
    referenceImages.push(link(ref.id, "primary_reference", ref.name));
  }
  if (character.primaryReferenceImageId) {
    referenceImages.push(
      link(
        studioAssetId("reference_image", `char_${character.id}`),
        "identity_pointer",
        character.primaryReferenceImageId
      )
    );
  }

  const mouthAssets = characterMouthAssets(character).map((m) =>
    link(m.id, "mouth_overlay", m.name)
  );

  const voiceAssets: StudioAssetLink[] = [];
  if (character.voiceEnabled && character.voiceProfile) {
    const identity = resolveCharacterVoiceIdentity({ character, language });
    voiceAssets.push(
      link(studioAssetId("voice", `char_voice_${character.id}`), "character_voice", identity.displayLabel)
    );
    voiceAssets.push(
      link(studioAssetId("voice", `preset_${identity.voiceProfile}`), "voice_preset", identity.voiceProfile)
    );
  }

  return {
    characterId: character.id,
    characterName: character.name,
    referenceImages,
    mouthAssets,
    voiceAssets,
  };
}

export function resolveLocationLinkedAssets(
  location: StudioLocationListItem,
  options?: { musicProfile?: string; directorProfile?: string }
): LocationAssetBundle {
  const referenceImages: StudioAssetLink[] = [];
  const ref = locationReferenceImageAsset(location);
  if (ref) {
    referenceImages.push(link(ref.id, "primary_reference", ref.name));
  }

  const ambienceAssets: StudioAssetLink[] = [];
  const env = location.environmentKeywords.toLowerCase();
  const ambCandidates = [
    env.includes("market") ? "amb_market" : null,
    env.includes("crowd") || env.includes("public") ? "amb_crowd" : null,
    env.includes("kitchen") || env.includes("restaurant") ? "amb_kitchen" : null,
    env.includes("office") ? "amb_office" : null,
    env.includes("city") || env.includes("urban") ? "amb_city_distant" : null,
    env.includes("garden") || env.includes("nature") || env.includes("outdoor") ? "amb_birds" : null,
  ].filter(Boolean) as string[];

  for (const ambId of [...new Set(ambCandidates)]) {
    const asset = getStudioAudioAsset(ambId);
    if (asset) {
      ambienceAssets.push(link(studioAssetId("ambience", ambId), "ambience_recommendation", asset.name));
    }
  }
  if (ambienceAssets.length === 0) {
    ambienceAssets.push(link(studioAssetId("ambience", "amb_office"), "default_ambience", "Office Room Tone"));
  }

  const musicRecommendations: StudioAssetLink[] = [];
  if (options?.musicProfile) {
    const cue: SceneMusicCue = {
      sceneId: location.id,
      order: 0,
      title: location.name,
      cueType: "intro",
      narrativeLabel: "intro",
      energyTarget: "low",
      transitionType: "crossfade",
      startBehavior: "fade_in",
      endBehavior: "fade_out",
      arcPhase: "discovery",
      emotion: "neutral",
      sceneEnergy: "calm",
      durationSeconds: 30,
      duckingRecommended: false,
      dialoguePriority: false,
      hasUserOverrides: false,
    };
    const music = selectMusicAssetForCue({
      cue,
      profileId: options.musicProfile,
      directorProfile: normalizeStudioDirectorProfile(options.directorProfile),
      arcPhase: "discovery",
    });
    if (music) {
      musicRecommendations.push(
        link(studioAssetId("music", music.id), "music_recommendation", music.name)
      );
    }
  }

  return {
    locationId: location.id,
    locationName: location.name,
    referenceImages,
    ambienceAssets,
    musicRecommendations,
    worldProfileId: location.worldProfileId,
  };
}

export function buildCharacterAssetBundles(
  storyboard: StudioStoryboardDetail
): CharacterAssetBundle[] {
  const byId = new Map<string, StudioCharacterListItem>();
  for (const scene of storyboard.scenes) {
    for (const c of scene.characters ?? []) {
      if (!byId.has(c.id)) {
        byId.set(c.id, c);
      }
    }
  }
  const lang = (storyboard.voiceLanguage ?? "en").slice(0, 2);
  return [...byId.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => resolveCharacterLinkedAssets(c, lang));
}

export function buildLocationAssetBundles(
  storyboard: StudioStoryboardDetail
): LocationAssetBundle[] {
  const byId = new Map<string, StudioLocationListItem>();
  for (const scene of storyboard.scenes) {
    if (scene.location && !byId.has(scene.location.id)) {
      byId.set(scene.location.id, scene.location);
    }
  }
  return [...byId.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((loc) =>
      resolveLocationLinkedAssets(loc, {
        musicProfile: storyboard.musicStyle || undefined,
        directorProfile: storyboard.directorProfile || undefined,
      })
    );
}

export function resolveAudioAssetsThroughRegistry(registry: StudioAsset[]): StudioAsset[] {
  return registry.filter((a) =>
    ["voice", "music", "ambience", "sound_effect"].includes(a.category)
  );
}
