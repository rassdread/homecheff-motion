import type {
  HomeCheffAssetReference,
  HomeCheffProjectPackage,
  HomeCheffProjectType,
} from "@/types/homecheff-project-package";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

export function createHcAssetReference(input: {
  id: string;
  url?: string;
  storageKey?: string;
  kind: string;
  role?: string;
  sourceService: HomeCheffProjectType;
  mimeType?: string;
}): HomeCheffAssetReference {
  return {
    id: input.id,
    url: input.url ?? "",
    storageKey: input.storageKey,
    kind: input.kind,
    role: input.role,
    sourceService: input.sourceService,
    createdAt: new Date().toISOString(),
    accessScope: "project",
    mimeType: input.mimeType,
  };
}

export function upsertHcAssetReference(
  project: HomeCheffProjectPackage,
  ref: HomeCheffAssetReference
): HomeCheffProjectPackage {
  const index = project.assetReferences.findIndex((r) => r.id === ref.id);
  const assetReferences =
    index >= 0
      ? project.assetReferences.map((r, i) => (i === index ? ref : r))
      : [...project.assetReferences, ref];
  return { ...project, assetReferences, updatedAt: new Date().toISOString() };
}

export function removeHcAssetReference(
  project: HomeCheffProjectPackage,
  assetId: string
): HomeCheffProjectPackage {
  return {
    ...project,
    assetReferences: project.assetReferences.filter((r) => r.id !== assetId),
    updatedAt: new Date().toISOString(),
  };
}

export function archiveHcAssetReference(
  project: HomeCheffProjectPackage,
  assetId: string
): HomeCheffProjectPackage {
  return {
    ...project,
    assetReferences: project.assetReferences.map((r) =>
      r.id === assetId ? { ...r, role: r.role ? `${r.role}:archived` : "archived" } : r
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function findHcAssetReference(
  project: HomeCheffProjectPackage,
  assetId: string
): HomeCheffAssetReference | undefined {
  return project.assetReferences.find((r) => r.id === assetId);
}

export function libraryMetadataFromConsistencyRecord(
  record: LibraryConsistencyRecord
): NonNullable<HomeCheffAssetReference["libraryMetadata"]> {
  return {
    assetType: record.assetType,
    workflow: record.workflow,
    characterType: record.characterType ?? null,
    characterCompleteness: record.characterCompleteness ?? null,
    motionReady: record.motionReady ?? null,
    motionReadinessScore: record.motionReadinessScore ?? null,
    missingParts: record.missingParts ?? null,
    fusionIntent: record.fusionIntent ?? null,
    fusionArchetype: record.fusionArchetype ?? null,
    fusionMetadata: record.fusionMetadata ?? null,
    motionMetadata: record.motionMetadata ?? null,
    publishMetadata: record.publishMetadata ?? null,
    sourceRoute: record.sourceRoute ?? null,
    sourceModule: record.sourceModule,
  };
}

export function attachLibraryMetadataToHcAsset(
  ref: HomeCheffAssetReference,
  record: LibraryConsistencyRecord
): HomeCheffAssetReference {
  return {
    ...ref,
    libraryMetadata: libraryMetadataFromConsistencyRecord(record),
  };
}

export function mergeHcPackageLibraryMetadata(
  project: HomeCheffProjectPackage,
  records: LibraryConsistencyRecord[]
): HomeCheffProjectPackage {
  if (records.length === 0) {
    return project;
  }
  const byUrl = new Map(records.map((r) => [r.assetUrl, r]));
  const byStorage = new Map(records.filter((r) => r.storageKey).map((r) => [r.storageKey, r]));
  const assetReferences = project.assetReferences.map((ref) => {
    const record = byUrl.get(ref.url) ?? (ref.storageKey ? byStorage.get(ref.storageKey) : undefined);
    return record ? attachLibraryMetadataToHcAsset(ref, record) : ref;
  });
  return { ...project, assetReferences, updatedAt: new Date().toISOString() };
}
