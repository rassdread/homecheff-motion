import { readHcWorkflowV2, storeStudioWorkflowInHc, writeHcWorkflowV2 } from "@/lib/hc-workflow-v2";
import {
  buildMissingAssetRequirements,
  normalizeRequirementStatus,
  type BriefAssetRequirement,
} from "@/lib/studio-brief-asset-wizards";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { StudioStoryPlan } from "@/types/studio-production-brief-v3";

export function loadBriefAssetRequirements(input: {
  storyPlan: StudioStoryPlan;
  hcProject?: HomeCheffProjectPackage | null;
}): BriefAssetRequirement[] {
  const built = buildMissingAssetRequirements({ storyPlan: input.storyPlan });
  if (!input.hcProject) {
    return built;
  }
  const root = readHcWorkflowV2(input.hcProject);
  const stored = root.studio?.briefAssetRequirements;
  if (!Array.isArray(stored) || stored.length === 0) {
    return built;
  }

  const storedById = new Map<string, BriefAssetRequirement>();
  for (const row of stored) {
    if (!row || typeof row !== "object" || !("id" in row)) {
      continue;
    }
    const req = row as BriefAssetRequirement;
    storedById.set(req.id, {
      ...req,
      status: normalizeRequirementStatus(String(req.status)),
    });
  }

  return built.map((req) => {
    const saved = storedById.get(req.id);
    if (!saved) {
      return req;
    }
    return {
      ...req,
      ...saved,
      sceneIds: req.sceneIds,
      label: req.label,
      kind: req.kind,
    };
  });
}

export function persistBriefAssetRequirements(
  project: HomeCheffProjectPackage,
  requirements: BriefAssetRequirement[]
): HomeCheffProjectPackage {
  const root = readHcWorkflowV2(project);
  return writeHcWorkflowV2(
    storeStudioWorkflowInHc(project, { phase: root.studio?.phase ?? "generate" }),
    {
      studio: {
        ...root.studio,
        phase: root.studio?.phase ?? "generate",
        briefAssetRequirements: requirements,
      },
    }
  );
}
