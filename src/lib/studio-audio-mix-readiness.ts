/**
 * Audio mix readiness — extends existing readiness patterns, no new score engine.
 */

import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";
import { parseStoryboardAudioAssetLinks } from "@/lib/studio-storyboard-audio-asset-links";

function libraryHasAsset(
  library: UserAudioLibraryAsset[],
  assetId: string | null | undefined,
  kind?: UserAudioLibraryAsset["kind"]
): boolean {
  const id = assetId?.trim();
  if (!id) {
    return false;
  }
  return library.some((a) => a.id === id && (!kind || a.kind === kind));
}

export type StoryboardAudioMixReadiness = {
  narrationLinked: boolean;
  musicLinked: boolean;
  soundLinked: boolean;
  mixReady: boolean;
};

export function resolveStoryboardAudioMixReadiness(params: {
  storyboard: Pick<
    StudioStoryboardDetail,
    "voiceEnabled" | "musicEnabled" | "soundEnabled" | "audioAssetLinks"
  >;
  hasVoiceAudio?: boolean;
  library?: UserAudioLibraryAsset[];
}): StoryboardAudioMixReadiness {
  const links = parseStoryboardAudioAssetLinks(params.storyboard.audioAssetLinks);
  const library = params.library ?? [];
  const narrationLinked = Boolean(params.hasVoiceAudio ?? params.storyboard.voiceEnabled);
  const musicLinked =
    Boolean(params.storyboard.musicEnabled)
    && libraryHasAsset(library, links.musicAssetId, "music");
  const soundLinked =
    Boolean(params.storyboard.soundEnabled)
    && libraryHasAsset(library, links.soundAssetId, "sfx");
  const mixReady =
    (!params.storyboard.musicEnabled || musicLinked)
    && (!params.storyboard.soundEnabled || soundLinked)
    && (!params.storyboard.voiceEnabled || narrationLinked);

  return { narrationLinked, musicLinked, soundLinked, mixReady };
}

export function audioMixStatusLabelKey(
  ready: boolean,
  linked: boolean
): string {
  if (linked && ready) {
    return "studio.audioMix.status.ready";
  }
  if (linked) {
    return "studio.audioMix.status.linked";
  }
  return "studio.audioMix.status.missing";
}
