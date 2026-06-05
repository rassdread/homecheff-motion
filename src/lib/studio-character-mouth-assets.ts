import type { CharacterPerformanceProfile } from "@/types/studio-character-performance";
import type { MouthMovementState } from "@/types/studio-character-performance";

export type CharacterMouthAssetUrls = {
  closed: string;
  small: string;
  medium: string;
  wide: string;
};

export function mouthAssetUrlsFromProfile(
  profile: Pick<
    CharacterPerformanceProfile,
    | "mouthClosedAssetUrl"
    | "mouthSmallAssetUrl"
    | "mouthMediumAssetUrl"
    | "mouthWideAssetUrl"
  >
): CharacterMouthAssetUrls {
  return {
    closed: profile.mouthClosedAssetUrl?.trim() ?? "",
    small: profile.mouthSmallAssetUrl?.trim() ?? "",
    medium: profile.mouthMediumAssetUrl?.trim() ?? "",
    wide: profile.mouthWideAssetUrl?.trim() ?? "",
  };
}

export function resolveMouthAssetUrl(
  profile: Pick<
    CharacterPerformanceProfile,
    | "mouthClosedAssetUrl"
    | "mouthSmallAssetUrl"
    | "mouthMediumAssetUrl"
    | "mouthWideAssetUrl"
  >,
  state: MouthMovementState
): string | null {
  const urls = mouthAssetUrlsFromProfile(profile);
  const direct = urls[state]?.trim();
  if (direct) {
    return direct;
  }
  if (state === "closed") {
    return null;
  }
  return urls.medium || urls.small || urls.wide || null;
}

export function characterHasMouthAssetsForOverlay(
  profile: Pick<CharacterPerformanceProfile, "mouthAnimationEnabled"> &
    Parameters<typeof mouthAssetUrlsFromProfile>[0]
): boolean {
  if (!profile.mouthAnimationEnabled) {
    return false;
  }
  const urls = mouthAssetUrlsFromProfile(profile);
  return Boolean(urls.small || urls.medium || urls.wide || urls.closed);
}
