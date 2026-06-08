import { parseCharacterReferencesBundle } from "@/lib/studio-character-canonical-references";
import { parseAssetReferencesBundle } from "@/lib/studio-asset-canonical-references";
import { listStudioCharacters } from "@/server/studio/studio-character-service";
import { listStudioLocations } from "@/server/studio/studio-location-service";
import { listStudioProps } from "@/server/studio/studio-prop-service";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import type { SessionUser } from "@/server/auth/session";

export async function listAssetDerivationSources(
  viewer: Pick<SessionUser, "id" | "role">
): Promise<AssetDerivationSourceListItem[]> {
  const [characters, props, locations] = await Promise.all([
    listStudioCharacters(viewer),
    listStudioProps(viewer),
    listStudioLocations(viewer),
  ]);

  const items: AssetDerivationSourceListItem[] = [];

  for (const c of characters) {
    if (c.referenceImageUrl?.trim()) {
      items.push({
        sourceType: "library_asset",
        kind: "character",
        assetId: c.id,
        name: c.name,
        referenceImageUrl: c.referenceImageUrl,
        referenceStorageKey: "",
        thumbnailUrl: c.referenceImageUrl,
      });
    }
    const { bundle } = parseCharacterReferencesBundle(c.referenceNotes ?? null);
    for (const ref of bundle.supporting) {
      if (ref.status === "active" && ref.imageUrl?.trim()) {
        items.push({
          sourceType: "canonical_reference",
          kind: "character",
          assetId: c.id,
          name: `${c.name} (${ref.role})`,
          referenceImageUrl: ref.imageUrl,
          referenceStorageKey: ref.storageKey,
          thumbnailUrl: ref.imageUrl,
          canonicalRole: ref.role,
        });
      }
    }
  }

  for (const p of props) {
    if (p.referenceImageUrl?.trim()) {
      items.push({
        sourceType: "library_asset",
        kind: "prop",
        assetId: p.id,
        name: p.name,
        referenceImageUrl: p.referenceImageUrl,
        referenceStorageKey: "",
        thumbnailUrl: p.referenceImageUrl,
      });
    }
    const { bundle } = parseAssetReferencesBundle(p.continuityNotes ?? null);
    for (const ref of bundle.supporting) {
      if (ref.status === "active" && ref.imageUrl?.trim()) {
        items.push({
          sourceType: "canonical_reference",
          kind: "prop",
          assetId: p.id,
          name: `${p.name} (${ref.role})`,
          referenceImageUrl: ref.imageUrl,
          referenceStorageKey: ref.storageKey,
          thumbnailUrl: ref.imageUrl,
          canonicalRole: ref.role,
        });
      }
    }
  }

  for (const l of locations) {
    if (l.referenceImageUrl?.trim()) {
      items.push({
        sourceType: "library_asset",
        kind: "location",
        assetId: l.id,
        name: l.name,
        referenceImageUrl: l.referenceImageUrl,
        referenceStorageKey: "",
        thumbnailUrl: l.referenceImageUrl,
      });
    }
    const { bundle } = parseAssetReferencesBundle(l.continuityNotes ?? null);
    for (const ref of bundle.supporting) {
      if (ref.status === "active" && ref.imageUrl?.trim()) {
        items.push({
          sourceType: "canonical_reference",
          kind: "location",
          assetId: l.id,
          name: `${l.name} (${ref.role})`,
          referenceImageUrl: ref.imageUrl,
          referenceStorageKey: ref.storageKey,
          thumbnailUrl: ref.imageUrl,
          canonicalRole: ref.role,
        });
      }
    }
  }

  return items;
}
