import { readHcProjectWorkflowStatus } from "@/lib/hc-project-lifecycle";
import { importHcProjectAsCopy } from "@/lib/homecheff-project-handoff";
import {
  downloadHcProjectFile,
  hcProjectFilename,
  migrateHomeCheffPackage,
  parseHomeCheffProjectFile,
  serializeHomeCheffProjectPackage,
  validateHomeCheffProjectPackage,
} from "@/lib/homecheff-project-package-core";
import { listHomeCheffProjects, persistHomeCheffProject } from "@/lib/homecheff-project-persist";
import { persistHcProjectWithSync } from "@/lib/homecheff-project-sync";
import { HOMECHEFF_PACKAGE_VERSION, type HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export const HC_PROJECT_FILE_VERSION_KEY = "hcProjectFileVersion";

export type HcProjectImportPreview = {
  project: HomeCheffProjectPackage;
  title: string;
  projectType: string;
  workflowStatus: string;
  sourceModule: string;
  assetCount: number;
  remoteAssetCount: number;
  missingAssetCount: number;
  hasMissingAssets: boolean;
  createdAt: string;
  sourceVersion: number;
  needsMigration: boolean;
  unsupportedVersion: boolean;
};

export type HcProjectFileValidationResult =
  | { ok: true; preview: HcProjectImportPreview; content: string }
  | { ok: false; errorKey: string; detail?: string };

function rejectUnsafeHcProjectContent(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) {
    return "hcProject.file.invalid";
  }
  if (trimmed.startsWith("<") || /<!DOCTYPE/i.test(trimmed)) {
    return "hcProject.file.invalid";
  }
  if (/<script[\s>]/i.test(trimmed)) {
    return "hcProject.file.invalid";
  }
  try {
    JSON.parse(trimmed);
  } catch {
    return "hcProject.file.invalid";
  }
  return null;
}

function isRemoteAssetUrl(url: string | undefined): boolean {
  if (!url?.trim()) {
    return false;
  }
  return /^https?:\/\//i.test(url.trim());
}

function assessImportAssets(project: HomeCheffProjectPackage): {
  assetCount: number;
  remoteAssetCount: number;
  missingAssetCount: number;
  hasMissingAssets: boolean;
} {
  const assets = project.assetReferences ?? [];
  const assetCount = assets.length;
  const remoteAssetCount = assets.filter((asset) => isRemoteAssetUrl(asset.url)).length;
  const missingAssetCount = assets.filter((asset) => !asset.url?.trim()).length;
  const hasMissingAssets = missingAssetCount > 0 || (assetCount > 0 && remoteAssetCount < assetCount);
  return { assetCount, remoteAssetCount, missingAssetCount, hasMissingAssets };
}

export function buildHcProjectExportManifest(project: HomeCheffProjectPackage): HomeCheffProjectPackage {
  return {
    ...project,
    metadata: {
      ...project.metadata,
      [HC_PROJECT_FILE_VERSION_KEY]: HOMECHEFF_PACKAGE_VERSION,
      exportedAt: new Date().toISOString(),
    },
  };
}

export function exportHcProjectRecord(project: HomeCheffProjectPackage): string {
  const manifest = buildHcProjectExportManifest(project);
  downloadHcProjectFile(manifest);
  return hcProjectFilename(project.title);
}

export function validateHcProjectFileContent(content: string): HcProjectFileValidationResult {
  const rejected = rejectUnsafeHcProjectContent(content);
  if (rejected) {
    return { ok: false, errorKey: rejected };
  }

  let parsed: HomeCheffProjectPackage;
  try {
    parsed = parseHomeCheffProjectFile(content);
  } catch {
    return { ok: false, errorKey: "hcProject.file.invalid" };
  }

  const unsupportedVersion = parsed.version > HOMECHEFF_PACKAGE_VERSION;
  if (unsupportedVersion) {
    return { ok: false, errorKey: "hcProject.file.unsupportedVersion" };
  }

  const needsMigration = parsed.version < HOMECHEFF_PACKAGE_VERSION;
  let migrated = parsed;
  try {
    migrated = migrateHomeCheffPackage(parsed);
  } catch (error) {
    return {
      ok: false,
      errorKey: "hcProject.file.unsupportedVersion",
      detail: error instanceof Error ? error.message : undefined,
    };
  }

  const validation = validateHomeCheffProjectPackage(migrated);
  if (!validation.ok) {
    return { ok: false, errorKey: "hcProject.file.invalid", detail: validation.errors.join(",") };
  }

  const assetSummary = assessImportAssets(migrated);
  const preview: HcProjectImportPreview = {
    project: migrated,
    title: migrated.title,
    projectType: migrated.projectType,
    workflowStatus: readHcProjectWorkflowStatus(migrated),
    sourceModule:
      (typeof migrated.metadata.sourceModule === "string" && migrated.metadata.sourceModule) ||
      migrated.sourceService ||
      migrated.projectType,
    createdAt: migrated.createdAt,
    sourceVersion: migrated.version,
    needsMigration,
    unsupportedVersion: false,
    ...assetSummary,
  };

  return { ok: true, preview, content };
}

function ensureUniqueImportTitle(project: HomeCheffProjectPackage): HomeCheffProjectPackage {
  const existingTitles = new Set(
    listHomeCheffProjects(200).map((entry) => entry.title.trim().toLowerCase()).filter(Boolean)
  );
  const title = project.title.trim() || "Imported project";
  if (!existingTitles.has(title.toLowerCase())) {
    return { ...project, title };
  }
  let index = 2;
  while (existingTitles.has(`${project.title.trim()} (${index})`.toLowerCase())) {
    index += 1;
  }
  return { ...project, title: `${project.title.trim()} (${index})` };
}

export type ImportHcProjectFileResult =
  | { ok: true; project: HomeCheffProjectPackage; filename: string }
  | { ok: false; errorKey: string; detail?: string };

export function importHcProjectFileAsNewProject(input: {
  content: string;
  userId?: string;
  syncToServer?: boolean;
}): ImportHcProjectFileResult {
  const validation = validateHcProjectFileContent(input.content);
  if (!validation.ok) {
    return validation;
  }

  let project = importHcProjectAsCopy(validation.preview.project, input.userId);
  project = ensureUniqueImportTitle(project);
  project = {
    ...project,
    metadata: {
      ...project.metadata,
      importedAt: new Date().toISOString(),
      importedFromVersion: validation.preview.sourceVersion,
      importHadMissingAssets: validation.preview.hasMissingAssets,
    },
  };
  project = persistHcProjectWithSync(project, {
    syncToServer: input.syncToServer ?? Boolean(input.userId),
  });
  persistHomeCheffProject(project);

  return { ok: true, project, filename: hcProjectFilename(validation.preview.title) };
}

export function serializeHcProjectExportForTests(project: HomeCheffProjectPackage): string {
  return serializeHomeCheffProjectPackage(buildHcProjectExportManifest(project));
}
