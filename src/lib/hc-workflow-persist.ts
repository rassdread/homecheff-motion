import { readHcWorkflowV2, writeHcWorkflowV2, type HcWorkflowV2Root } from "@/lib/hc-workflow-v2";
import { persistHcProjectWithSync } from "@/lib/homecheff-project-sync";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

/** Persist workflow v2 locally and sync to server when owner is authenticated. */
export function persistHcWorkflowV2WithSync(
  project: HomeCheffProjectPackage,
  _patch: Partial<HcWorkflowV2Root> = {},
  options: { syncToServer?: boolean } = { syncToServer: true }
): HomeCheffProjectPackage {
  return persistHcProjectWithSync(project, { syncToServer: options.syncToServer ?? true });
}

export function restoreHcWorkflowV2FromProject(project: HomeCheffProjectPackage): HcWorkflowV2Root {
  return readHcWorkflowV2(project);
}
