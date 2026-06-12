import type {
  HomeCheffAssetReference,
  HomeCheffProjectPackage,
  HomeCheffProjectType,
} from "@/types/homecheff-project-package";

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
