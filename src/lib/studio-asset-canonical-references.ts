/**
 * Canonical reference bundles for prop + location (same pattern as character refs in notes).
 * Stored in continuityNotes with marker — no schema migration.
 */

export const ASSET_REFS_MARKER = "[asset:refs]";

export type AssetSupportingReferenceRole = "angle" | "detail" | "context" | "variant";

export type AssetSupportingReference = {
  id: string;
  role: AssetSupportingReferenceRole;
  imageUrl: string;
  storageKey: string;
  uploadedAt: string;
  status: "active" | "archived";
};

export type AssetArchivedReference = {
  id: string;
  imageUrl: string;
  storageKey: string;
  archivedAt: string;
  reason?: string;
};

export type AssetReferencesBundle = {
  version: 1;
  primarySetAt: string | null;
  supporting: AssetSupportingReference[];
  archive: AssetArchivedReference[];
};

export function emptyAssetReferencesBundle(): AssetReferencesBundle {
  return { version: 1, primarySetAt: null, supporting: [], archive: [] };
}

export function parseAssetReferencesBundle(rawNotes: string | null | undefined): {
  humanNotes: string;
  bundle: AssetReferencesBundle;
} {
  const trimmed = (rawNotes ?? "").trim();
  const markerIndex = trimmed.indexOf(ASSET_REFS_MARKER);
  if (markerIndex === -1) {
    return { humanNotes: trimmed, bundle: emptyAssetReferencesBundle() };
  }
  const humanNotes = trimmed.slice(0, markerIndex).trim();
  const jsonPart = trimmed.slice(markerIndex + ASSET_REFS_MARKER.length).trim();
  if (!jsonPart) {
    return { humanNotes, bundle: emptyAssetReferencesBundle() };
  }
  try {
    const parsed = JSON.parse(jsonPart) as Partial<AssetReferencesBundle>;
    if (parsed.version !== 1) {
      return { humanNotes, bundle: emptyAssetReferencesBundle() };
    }
    return {
      humanNotes,
      bundle: {
        version: 1,
        primarySetAt: typeof parsed.primarySetAt === "string" ? parsed.primarySetAt : null,
        supporting: Array.isArray(parsed.supporting) ? parsed.supporting : [],
        archive: Array.isArray(parsed.archive) ? parsed.archive : [],
      },
    };
  } catch {
    return { humanNotes, bundle: emptyAssetReferencesBundle() };
  }
}

export function formatAssetReferencesBundle(bundle: AssetReferencesBundle): string {
  return `${ASSET_REFS_MARKER}\n${JSON.stringify(bundle)}`;
}

export function appendAssetReferencesToNotes(
  existingNotes: string,
  bundle: AssetReferencesBundle
): string {
  const { humanNotes } = parseAssetReferencesBundle(existingNotes);
  const block = formatAssetReferencesBundle(bundle);
  return humanNotes ? `${humanNotes}\n\n${block}` : block;
}

export function markPrimaryReferenceSet(bundle: AssetReferencesBundle): AssetReferencesBundle {
  return {
    ...bundle,
    primarySetAt: bundle.primarySetAt ?? new Date().toISOString(),
  };
}
