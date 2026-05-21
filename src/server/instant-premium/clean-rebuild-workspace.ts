import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
function localMergedFinalVideoPath(projectId: string): string {
  return path.join(
    process.cwd(),
    "public",
    "generated",
    "animations",
    "projects",
    projectId,
    "final.mp4"
  );
}

export function createRebuildWorkspacePath(projectId: string, rebuildId: string): string {
  return path.join(os.tmpdir(), `rebuild-${projectId}-${rebuildId}`);
}

/** Remove stale merge outputs; never deletes provider segment URLs in blob storage. */
export async function purgeStaleProjectMergeArtifacts(projectId: string): Promise<void> {
  const localFinal = localMergedFinalVideoPath(projectId);
  await fs.rm(localFinal, { force: true }).catch(() => undefined);

  const publicProjectDir = path.join(
    process.cwd(),
    "public",
    "generated",
    "animations",
    "projects",
    projectId
  );
  const entries = await fs.readdir(publicProjectDir).catch(() => [] as string[]);
  for (const name of entries) {
    if (name.endsWith(".mp4") && (name.startsWith("final") || name.includes("concat"))) {
      await fs.rm(path.join(publicProjectDir, name), { force: true }).catch(() => undefined);
    }
  }

  const tmp = os.tmpdir();
  const prefixes = [`hc-instant-merge-${projectId}-`, `rebuild-${projectId}-`];
  const dirEntries = await fs.readdir(tmp).catch(() => [] as string[]);
  for (const name of dirEntries) {
    if (prefixes.some((p) => name.startsWith(p))) {
      await fs.rm(path.join(tmp, name), { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

export async function createCleanRebuildWorkspace(
  projectId: string,
  rebuildId: string
): Promise<string> {
  await purgeStaleProjectMergeArtifacts(projectId);
  const workspace = createRebuildWorkspacePath(projectId, rebuildId);
  await fs.mkdir(workspace, { recursive: true });
  return workspace;
}

export async function removeRebuildWorkspace(workspacePath: string): Promise<void> {
  await fs.rm(workspacePath, { recursive: true, force: true }).catch(() => undefined);
}
