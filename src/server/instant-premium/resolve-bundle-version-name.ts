import { prisma } from "@/lib/prisma";
import {
  collectVersionNamesFromCatalog,
  MAX_VERSION_NAME_LENGTH,
  normalizeVersionName,
  resolveVersionNameForPersist,
} from "@/lib/smart-version-naming";
import { buildDetailBundleCatalog } from "@/server/animation-projects/build-detail-bundle-catalog";

/**
 * Resolve a user-entered version name against the bundle catalog.
 * Never returns a name that collides with an existing slot label.
 */
export async function resolveVersionNameAgainstBundle(params: {
  anchorProjectId: string;
  sourceProjectId?: string | null;
  versionNote: string | undefined;
  locale?: "en" | "nl";
  /** When true, keep the user-entered name (concept editor explicit choice). */
  explicit?: boolean;
}): Promise<string | undefined> {
  const trimmed = params.versionNote?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (params.explicit) {
    return normalizeVersionName(trimmed).slice(0, MAX_VERSION_NAME_LENGTH);
  }

  const catalogProjectId = params.sourceProjectId?.trim() || params.anchorProjectId;
  const project = await prisma.animationProject.findUnique({
    where: { id: catalogProjectId },
    select: {
      id: true,
      ownerId: true,
      title: true,
      bundleName: true,
      bundleKey: true,
      projectType: true,
    },
  });
  if (!project) {
    return resolveVersionNameForPersist(trimmed, []);
  }

  const bundle = await buildDetailBundleCatalog({
    project: {
      id: project.id,
      ownerId: project.ownerId,
      title: project.title,
      bundleName: project.bundleName,
      bundleKey: project.bundleKey,
      projectType: project.projectType,
    },
    locale: params.locale ?? "nl",
  });

  return resolveVersionNameForPersist(
    trimmed,
    collectVersionNamesFromCatalog(bundle.catalog)
  );
}
