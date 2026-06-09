import { isCanonicalCharacterBaseRecord } from "@/lib/studio-asset-character-evolution";
import { extractAssetSemanticRecordFromCharacter } from "@/lib/studio-asset-semantic-record";
import { parseCharacterReferencesBundle } from "@/lib/studio-character-canonical-references";
import { parseAssetReferencesBundle } from "@/lib/studio-asset-canonical-references";
import { listStudioCharacters } from "@/server/studio/studio-character-service";
import { listStudioLocations } from "@/server/studio/studio-location-service";
import { listStudioProps } from "@/server/studio/studio-prop-service";
import { listUserLibraryUploads } from "@/server/studio/studio-user-upload-library-blob";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import type { SessionUser } from "@/server/auth/session";
import type { UserLibraryUploadAssetType } from "@/types/studio-user-upload-library";

const IMAGE_UPLOAD_TYPES = new Set<UserLibraryUploadAssetType>([
  "reference_image",
  "source_image",
  "character_image",
  "prop_image",
  "location_image",
]);

function uploadKindForAssetType(
  assetType: UserLibraryUploadAssetType
): AssetDerivationSourceListItem["kind"] {
  if (assetType === "character_image") return "character";
  if (assetType === "prop_image") return "prop";
  if (assetType === "location_image") return "location";
  return "character";
}

export async function listAssetDerivationSources(
  viewer: Pick<SessionUser, "id" | "role">
): Promise<AssetDerivationSourceListItem[]> {
  const [characters, props, locations, userUploads] = await Promise.all([
    listStudioCharacters(viewer),
    listStudioProps(viewer),
    listStudioLocations(viewer),
    listUserLibraryUploads(viewer.id),
  ]);

  const items: AssetDerivationSourceListItem[] = [];

  for (const c of characters) {
    const semanticRecord = extractAssetSemanticRecordFromCharacter(c);
    const isCanonicalBase = isCanonicalCharacterBaseRecord(semanticRecord);
    if (c.referenceImageUrl?.trim()) {
      items.push({
        sourceType: "library_asset",
        kind: "character",
        assetId: c.id,
        name: isCanonicalBase ? `${c.name} (Canonical Base)` : c.name,
        referenceImageUrl: c.referenceImageUrl,
        referenceStorageKey: "",
        thumbnailUrl: c.referenceImageUrl,
        identityAssetType: semanticRecord.identityAssetType,
        isCanonicalCharacterBase: isCanonicalBase,
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

  for (const upload of userUploads) {
    if (!IMAGE_UPLOAD_TYPES.has(upload.assetType) || !upload.publicUrl?.trim()) {
      continue;
    }
    items.push({
      sourceType: "upload",
      kind: uploadKindForAssetType(upload.assetType),
      assetId: upload.id,
      name: upload.fileName.replace(/\.[^.]+$/, "") || "Upload",
      referenceImageUrl: upload.publicUrl,
      referenceStorageKey: upload.storageKey,
      thumbnailUrl: upload.thumbnailUrl ?? upload.publicUrl,
    });
  }

  return items;
}
