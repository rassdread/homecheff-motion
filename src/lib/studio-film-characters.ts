/**
 * Project character lookup shared by the film workspace and scene assignment.
 * Uses StudioLibraryAsset.metadata.characterId. No new table.
 *
 * Future opt-in, not active: Made With Passion may later require a character
 * master before scene-image generation. Do not enforce CHARACTER_MASTER_REQUIRED
 * for every character. A missing master stays optional for existing generation.
 */

export function characterIdFromLibraryMetadata(metadataJson: unknown): string {
  if (!metadataJson || typeof metadataJson !== "object") return "";
  const value = (metadataJson as { characterId?: unknown }).characterId;
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function characterIdsFromLibraryAssets(
  assets: Array<{ family: string; metadataJson: unknown }>,
): string[] {
  const ids = assets
    .filter((asset) => asset.family === "character")
    .map((asset) => characterIdFromLibraryMetadata(asset.metadataJson))
    .filter(Boolean);
  return [...new Set(ids)];
}

/** Same scene assignment, repeated, stays one join row. Order of first occurrence is kept. */
export function uniqueSceneCharacterIds(characterIds: string[]): string[] {
  return [...new Set(characterIds.map((id) => id.trim()).filter(Boolean))];
}

/** Ids the film scene writer must reject. Existing film members are not in this list. */
export function rejectedFilmCharacterIds(requested: string[], allowed: ReadonlySet<string>): string[] {
  return requested.filter((id) => !allowed.has(id));
}

export function normalizeFilmRequestKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const key = value.trim();
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(key)) return null;
  return key;
}
