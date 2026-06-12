import { triggerBrowserDownload } from "@/lib/editor-export-download";
import {
  HOMECHEFF_PACKAGE_VERSION,
  type HomeCheffAssetReference,
  type HomeCheffPackageVersion,
  type HomeCheffProjectPackage,
  type HomeCheffProjectPermission,
  type HomeCheffProjectType,
  type HomeCheffShareMode,
} from "@/types/homecheff-project-package";

export function createHomeCheffProjectId(): string {
  return `hcproj_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultProjectPermissions(shareMode: HomeCheffShareMode = "private_backup"): HomeCheffProjectPermission {
  switch (shareMode) {
    case "view_only":
      return {
        view: true,
        edit: false,
        copy: false,
        downloadAssets: false,
        commercialUse: false,
        share: true,
        shareMode,
      };
    case "editable_copy":
      return {
        view: true,
        edit: true,
        copy: true,
        downloadAssets: true,
        commercialUse: false,
        share: true,
        shareMode,
      };
    case "download_allowed":
      return {
        view: true,
        edit: false,
        copy: true,
        downloadAssets: true,
        commercialUse: false,
        share: true,
        shareMode,
      };
    case "commercial_use":
      return {
        view: true,
        edit: true,
        copy: true,
        downloadAssets: true,
        commercialUse: true,
        share: true,
        shareMode,
      };
    default:
      return {
        view: true,
        edit: true,
        copy: false,
        downloadAssets: true,
        commercialUse: false,
        share: false,
        shareMode,
      };
  }
}

export function sanitizeFilename(title: string): string {
  return title.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "") || "homecheff-project";
}

export function hcProjectFilename(title: string): string {
  return `${sanitizeFilename(title)}.hc`;
}

export function serializeHomeCheffProjectPackage(pkg: HomeCheffProjectPackage): string {
  return JSON.stringify(pkg, null, 2);
}

export function parseHomeCheffProjectFile(content: string): HomeCheffProjectPackage {
  const parsed = JSON.parse(content) as HomeCheffProjectPackage;
  if (!parsed?.id || !parsed.version) {
    throw new Error("Invalid HomeCheff project file");
  }
  return parsed;
}

export function migrateHomeCheffPackage(pkg: HomeCheffProjectPackage): HomeCheffProjectPackage {
  if (pkg.version === HOMECHEFF_PACKAGE_VERSION) {
    return pkg;
  }
  if (pkg.version > HOMECHEFF_PACKAGE_VERSION) {
    throw new Error("This project was created with a newer HomeCheff version.");
  }
  return { ...pkg, version: HOMECHEFF_PACKAGE_VERSION as HomeCheffPackageVersion };
}

export function validateHomeCheffProjectPackage(pkg: HomeCheffProjectPackage): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!pkg.id) errors.push("missing_id");
  if (!pkg.title) errors.push("missing_title");
  if (!pkg.projectType) errors.push("missing_project_type");
  if (!pkg.permissions) errors.push("missing_permissions");
  if (!Array.isArray(pkg.assetReferences)) errors.push("missing_asset_references");
  if (pkg.version !== HOMECHEFF_PACKAGE_VERSION) errors.push("unsupported_version");
  return { ok: errors.length === 0, errors };
}

export function projectAssetIds(pkg: HomeCheffProjectPackage): Set<string> {
  return new Set(pkg.assetReferences.map((a) => a.id));
}

export function filterProjectAssets(
  pkg: HomeCheffProjectPackage,
  allowedAssetIds: Set<string>
): HomeCheffAssetReference[] {
  return pkg.assetReferences.filter((asset) => allowedAssetIds.has(asset.id));
}

export function stripUnrelatedOwnerData(pkg: HomeCheffProjectPackage): HomeCheffProjectPackage {
  return {
    ...pkg,
    ownerId: undefined,
    permissions: {
      ...pkg.permissions,
      allowedUserIds: pkg.permissions.share ? pkg.permissions.allowedUserIds : undefined,
      allowedTeamIds: pkg.permissions.share ? pkg.permissions.allowedTeamIds : undefined,
    },
  };
}

export function downloadHcProjectFile(pkg: HomeCheffProjectPackage): void {
  const blob = new Blob([serializeHomeCheffProjectPackage(pkg)], {
    type: "application/vnd.homecheff.project+json",
  });
  const url = URL.createObjectURL(blob);
  triggerBrowserDownload(url, hcProjectFilename(pkg.title));
  URL.revokeObjectURL(url);
}

export function resolveHcProjectOpenTargets(pkg: HomeCheffProjectPackage): HomeCheffProjectType[] {
  const targets: HomeCheffProjectType[] = [];
  if (pkg.servicePayload.editor) targets.push("editor");
  if (pkg.servicePayload.motion) targets.push("motion");
  if (pkg.servicePayload.publish) targets.push("publish");
  if (pkg.servicePayload.studio) targets.push("studio");
  if (pkg.servicePayload.library) targets.push("library");
  if (!targets.length) {
    targets.push(pkg.projectType);
  }
  return targets;
}

export function resolveHcProjectOpenRoute(projectId: string, service: HomeCheffProjectType): string {
  switch (service) {
    case "editor":
      return `/editor/start?hcProject=${encodeURIComponent(projectId)}`;
    case "motion":
      return `/motion/start?hcProject=${encodeURIComponent(projectId)}`;
    case "publish":
      return `/publish/start?hcProject=${encodeURIComponent(projectId)}`;
    case "studio":
      return `/studio/start?hcProject=${encodeURIComponent(projectId)}`;
    case "library":
      return `/library/start?hcProject=${encodeURIComponent(projectId)}`;
    default:
      return `/editor/start?hcProject=${encodeURIComponent(projectId)}`;
  }
}

export function buildHcHandoffUrl(projectId: string, targetService: HomeCheffProjectType): string {
  return `${resolveHcProjectOpenRoute(projectId, targetService)}&handoff=1`;
}
