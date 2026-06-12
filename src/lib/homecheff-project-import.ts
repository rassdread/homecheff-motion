import {
  migrateHomeCheffPackage,
  parseHomeCheffProjectFile,
  validateHomeCheffProjectPackage,
} from "@/lib/homecheff-project-package-core";
import { importHcProjectAsCopy, validateImportPermissions } from "@/lib/homecheff-project-handoff";
import { persistHomeCheffProject } from "@/lib/homecheff-project-persist";
import { importHcProjectToServer } from "@/lib/homecheff-project-sync";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export type ImportHcProjectResult =
  | { ok: true; project: HomeCheffProjectPackage; copied: boolean }
  | { ok: false; reason: string };

export async function importHomeCheffProjectFile(input: {
  content: string;
  userId?: string;
  syncToServer?: boolean;
}): Promise<ImportHcProjectResult> {
  if (input.syncToServer && input.userId) {
    const server = await importHcProjectToServer(input.content);
    if (server.ok && server.project) {
      return { ok: true, project: server.project, copied: Boolean(server.copied) };
    }
  }

  let parsed: HomeCheffProjectPackage;
  try {
    parsed = migrateHomeCheffPackage(parseHomeCheffProjectFile(input.content));
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "parse_failed",
    };
  }

  const validation = validateHomeCheffProjectPackage(parsed);
  if (!validation.ok) {
    return { ok: false, reason: validation.errors.join(",") };
  }

  const isOwner = Boolean(input.userId && parsed.ownerId && input.userId === parsed.ownerId);
  const permission = validateImportPermissions(parsed, { userId: input.userId, isOwner });
  if (!permission.allowed) {
    return { ok: false, reason: permission.reason ?? "permission_denied" };
  }

  let project = parsed;
  let copied = false;
  if (permission.shouldCopy && !isOwner) {
    project = importHcProjectAsCopy(parsed, input.userId);
    copied = true;
  }

  if (typeof window !== "undefined") {
    project = persistHomeCheffProject(project);
  }

  return { ok: true, project, copied };
}

export function validateProjectAssetAccess(
  project: HomeCheffProjectPackage,
  assetId: string
): boolean {
  return project.assetReferences.some((asset) => asset.id === assetId);
}

export function missingProjectAssets(project: HomeCheffProjectPackage, accessibleUrls: Set<string>): string[] {
  return project.assetReferences.filter((a) => !accessibleUrls.has(a.url)).map((a) => a.id);
}
