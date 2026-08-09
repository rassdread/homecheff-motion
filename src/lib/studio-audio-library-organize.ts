/**
 * S.7D — Music & SFX library organization (reuse free).
 */

import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";

export const STUDIO_MUSIC_LIBRARY_BUCKETS = [
  "generated",
  "uploaded",
  "favorites",
  "brand_music",
  "project_themes",
  "recent",
] as const;

export type StudioMusicLibraryBucket = (typeof STUDIO_MUSIC_LIBRARY_BUCKETS)[number];

export const STUDIO_SFX_LIBRARY_BUCKETS = [
  "generated",
  "uploaded",
  "favorites",
  "categories",
  "project_assets",
  "recent",
] as const;

export type StudioSfxLibraryBucket = (typeof STUDIO_SFX_LIBRARY_BUCKETS)[number];

export type OrganizedAudioLibraryEntry = {
  id: string;
  kind: "music" | "sfx";
  bucket: string;
  label: string;
  asset: UserAudioLibraryAsset;
  reuseWithoutCharge: true;
};

export function organizeMusicLibrary(
  assets: UserAudioLibraryAsset[],
  options?: { favoriteIds?: string[]; brandIds?: string[]; projectIds?: string[] }
): OrganizedAudioLibraryEntry[] {
  const favorites = new Set(options?.favoriteIds ?? []);
  const brand = new Set(options?.brandIds ?? []);
  const project = new Set(options?.projectIds ?? []);
  return assets
    .filter((a) => a.kind === "music")
    .map((asset) => {
      let bucket: StudioMusicLibraryBucket = "generated";
      if (brand.has(asset.id)) bucket = "brand_music";
      else if (project.has(asset.id)) bucket = "project_themes";
      else if (favorites.has(asset.id)) bucket = "favorites";
      else if (asset.storageKey.includes("/uploads/")) bucket = "uploaded";
      return {
        id: asset.id,
        kind: "music" as const,
        bucket,
        label: asset.name,
        asset,
        reuseWithoutCharge: true as const,
      };
    });
}

export function organizeSfxLibrary(
  assets: UserAudioLibraryAsset[],
  options?: { favoriteIds?: string[]; projectIds?: string[] }
): OrganizedAudioLibraryEntry[] {
  const favorites = new Set(options?.favoriteIds ?? []);
  const project = new Set(options?.projectIds ?? []);
  return assets
    .filter((a) => a.kind === "sfx")
    .map((asset) => {
      let bucket: StudioSfxLibraryBucket = "categories";
      if (project.has(asset.id)) bucket = "project_assets";
      else if (favorites.has(asset.id)) bucket = "favorites";
      else if (asset.storageKey.includes("/uploads/")) bucket = "uploaded";
      else bucket = "generated";
      return {
        id: asset.id,
        kind: "sfx" as const,
        bucket,
        label: asset.name,
        asset,
        reuseWithoutCharge: true as const,
      };
    });
}
