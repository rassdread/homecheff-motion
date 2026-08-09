/**
 * S.7D — Canonical Music Studio contract.
 * Aggregates storyboard music fields + linked library asset — no Prisma duplication.
 */

import { parseStoryboardAudioAssetLinks } from "@/lib/studio-storyboard-audio-asset-links";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";

export type StudioMusicThemeRole =
  | "primary"
  | "secondary"
  | "brand"
  | "intro"
  | "outro"
  | "ending";

export type StudioMusicIdentity = {
  version: "7d.1";
  storyboardId: string;
  themes: Array<{
    role: StudioMusicThemeRole;
    assetId: string | null;
    style: string | null;
    emotion: string | null;
    energy: string | null;
    /** Reusable — not regenerated on handoff */
    reusable: true;
  }>;
  linkedMusicAssetId: string | null;
};

export type StudioMusicStudioContract = {
  version: "7d.1";
  storyboardId: string;
  identity: StudioMusicIdentity;
  characteristics: {
    genre: string | null;
    tempo: string | null;
    emotion: string | null;
    energy: string | null;
    instrumentation: string | null;
    mood: string | null;
    intensity: string | null;
    narrativeRole: string | null;
    loopBehaviour: "loop" | "once" | "unknown";
    durationSeconds: number | null;
  };
  linkedAsset: UserAudioLibraryAsset | null;
  providerCapabilities: {
    generate: true;
    preview: true;
    library: true;
    history: true;
  };
  reuse: {
    reuseWithoutRegeneration: true;
  };
  preview: {
    replacesFinalGeneration: false;
    supported: true;
  };
};

export function buildMusicIdentity(
  storyboard: StudioStoryboardDetail,
  linkedMusicAssetId?: string | null
): StudioMusicIdentity {
  const links = parseStoryboardAudioAssetLinks(storyboard.audioAssetLinks);
  const assetId = linkedMusicAssetId ?? links.musicAssetId ?? null;
  const style = storyboard.musicStyle?.trim() || null;
  const intensity = storyboard.musicIntensity?.trim() || null;

  const themes: StudioMusicIdentity["themes"] = [
    {
      role: "primary",
      assetId,
      style,
      emotion: style,
      energy: intensity,
      reusable: true,
    },
    { role: "intro", assetId: null, style, emotion: style, energy: intensity, reusable: true },
    { role: "outro", assetId: null, style, emotion: style, energy: intensity, reusable: true },
    { role: "ending", assetId: null, style, emotion: style, energy: intensity, reusable: true },
    { role: "secondary", assetId: null, style: null, emotion: null, energy: null, reusable: true },
    { role: "brand", assetId: null, style: null, emotion: null, energy: null, reusable: true },
  ];

  return {
    version: "7d.1",
    storyboardId: storyboard.id,
    themes,
    linkedMusicAssetId: assetId,
  };
}

export function buildMusicStudio(
  storyboard: StudioStoryboardDetail,
  options?: { linkedAsset?: UserAudioLibraryAsset | null }
): StudioMusicStudioContract {
  const linkedAsset = options?.linkedAsset ?? null;
  const identity = buildMusicIdentity(storyboard, linkedAsset?.id ?? null);

  return {
    version: "7d.1",
    storyboardId: storyboard.id,
    identity,
    characteristics: {
      genre: storyboard.musicStyle?.trim() || linkedAsset?.category || null,
      tempo: null,
      emotion: linkedAsset?.mood || storyboard.musicStyle?.trim() || null,
      energy: linkedAsset?.energy || storyboard.musicIntensity?.trim() || null,
      instrumentation: null,
      mood: linkedAsset?.mood || null,
      intensity: storyboard.musicIntensity?.trim() || null,
      narrativeRole: storyboard.musicNarrativeRole?.trim() || null,
      loopBehaviour: "loop",
      durationSeconds: linkedAsset?.durationSeconds ?? null,
    },
    linkedAsset,
    providerCapabilities: {
      generate: true,
      preview: true,
      library: true,
      history: true,
    },
    reuse: { reuseWithoutRegeneration: true },
    preview: { replacesFinalGeneration: false, supported: true },
  };
}
