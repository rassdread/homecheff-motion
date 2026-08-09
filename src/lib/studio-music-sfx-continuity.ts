/**
 * S.7D — Music / SFX / ambience continuity checks (metadata only).
 */

import { parseStoryboardAudioAssetLinks } from "@/lib/studio-storyboard-audio-asset-links";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export type AudioAssetContinuityHop =
  | "storyboard"
  | "motion"
  | "render"
  | "export";

export type AudioAssetContinuityCheck = {
  ok: boolean;
  kind: "music" | "sfx" | "ambience";
  expectedAssetId: string | null;
  hops: Array<{ hop: AudioAssetContinuityHop; assetId: string | null; match: boolean }>;
  driftDetected: boolean;
  /** Reuse must not imply regeneration */
  regenerationForbidden: true;
};

export function checkMusicContinuity(input: {
  storyboard: StudioStoryboardDetail;
  motionMusicAssetId?: string | null;
  renderMusicAssetId?: string | null;
}): AudioAssetContinuityCheck {
  const links = parseStoryboardAudioAssetLinks(input.storyboard.audioAssetLinks);
  const expected = links.musicAssetId ?? null;
  const hops: AudioAssetContinuityCheck["hops"] = [
    { hop: "storyboard", assetId: expected, match: true },
  ];
  if (input.motionMusicAssetId !== undefined) {
    hops.push({
      hop: "motion",
      assetId: input.motionMusicAssetId,
      match: !expected || input.motionMusicAssetId === expected,
    });
  }
  if (input.renderMusicAssetId !== undefined) {
    hops.push({
      hop: "render",
      assetId: input.renderMusicAssetId,
      match: !expected || input.renderMusicAssetId === expected,
    });
  }
  const driftDetected = hops.some((h) => !h.match);
  return {
    ok: !driftDetected,
    kind: "music",
    expectedAssetId: expected,
    hops,
    driftDetected,
    regenerationForbidden: true,
  };
}

export function checkSfxContinuity(input: {
  storyboard: StudioStoryboardDetail;
  motionSfxAssetId?: string | null;
  renderSfxAssetId?: string | null;
}): AudioAssetContinuityCheck {
  const links = parseStoryboardAudioAssetLinks(input.storyboard.audioAssetLinks);
  const expected = links.soundAssetId ?? null;
  const hops: AudioAssetContinuityCheck["hops"] = [
    { hop: "storyboard", assetId: expected, match: true },
  ];
  if (input.motionSfxAssetId !== undefined) {
    hops.push({
      hop: "motion",
      assetId: input.motionSfxAssetId,
      match: !expected || input.motionSfxAssetId === expected,
    });
  }
  if (input.renderSfxAssetId !== undefined) {
    hops.push({
      hop: "render",
      assetId: input.renderSfxAssetId,
      match: !expected || input.renderSfxAssetId === expected,
    });
  }
  const driftDetected = hops.some((h) => !h.match);
  return {
    ok: !driftDetected,
    kind: "sfx",
    expectedAssetId: expected,
    hops,
    driftDetected,
    regenerationForbidden: true,
  };
}
