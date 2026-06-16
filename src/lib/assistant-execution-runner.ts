import { applyPreparedAssetsToPrefillPackage, linkPreparedAssetToHcProject } from "@/lib/assistant-execution-prefill";
import {
  appendAssistantExecutionLogEntry,
  buildExecutionLogEntry,
  collectPreparedAssetsFromPlan,
} from "@/lib/assistant-execution-project-log";
import { buildAssistantExecutionPlan } from "@/lib/assistant-execution-plan-builder";
import { loadHomeCheffProject, persistHomeCheffProject } from "@/lib/homecheff-project-persist";
import {
  storeAssistantEditorFusionBootstrap,
  storeAssistantPrefillPackage,
  updateAssistantPrefillPackage,
} from "@/lib/assistant-prefill-storage";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";
import type { AssistantExecutionPlan } from "@/types/assistant-tool-execution";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

function libraryAssetNameMap(records: LibraryConsistencyRecord[]) {
  const map: Record<string, { assetName: string; assetUrl: string; thumbnailUrl?: string | null }> =
    {};
  for (const record of records) {
    map[record.registryAssetId] = {
      assetName: record.assetName,
      assetUrl: record.assetUrl,
      thumbnailUrl: record.thumbnailUrl,
    };
  }
  return map;
}

export async function requestAssistantExecutionPlan(input: {
  pkg: AssistantPrefillPackage;
  activeProject?: { id: string; title?: string } | null;
  confirmed?: boolean;
}): Promise<AssistantExecutionPlan | null> {
  const res = await fetch("/api/assistant/execute/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prefillPackage: input.pkg,
      activeProject: input.activeProject,
      confirmed: input.confirmed ?? false,
    }),
  });
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as { plan?: AssistantExecutionPlan };
  return data.plan ?? null;
}

export async function runAssistantExecutionPlan(input: {
  pkg: AssistantPrefillPackage;
  plan: AssistantExecutionPlan;
  libraryRecords: LibraryConsistencyRecord[];
  projectId?: string | null;
}): Promise<{ pkg: AssistantPrefillPackage; plan: AssistantExecutionPlan } | null> {
  const res = await fetch("/api/assistant/execute/step", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plan: { ...input.plan, status: "running", confirmedAt: new Date().toISOString() },
      confirmed: true,
      runAll: true,
      libraryAssetNames: libraryAssetNameMap(input.libraryRecords),
    }),
  });
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as { plan?: AssistantExecutionPlan };
  const plan = data.plan;
  if (!plan) {
    return null;
  }

  let project = input.projectId ? loadHomeCheffProject(input.projectId) : null;
  const preparedAssets = collectPreparedAssetsFromPlan(plan);
  for (const step of plan.steps) {
    if (project) {
      const entry = buildExecutionLogEntry(plan, step, step.status);
      project = appendAssistantExecutionLogEntry(project, plan, entry);
      if (step.output?.preparedAsset) {
        project = linkPreparedAssetToHcProject(project, step.output.preparedAsset);
      }
    }
  }
  if (project) {
    persistHomeCheffProject(project);
  }

  let nextPkg = applyPreparedAssetsToPrefillPackage(input.pkg, preparedAssets, plan);
  nextPkg = storeAssistantPrefillPackage(nextPkg);
  updateAssistantPrefillPackage(nextPkg.id, nextPkg);

  const reviewStep = plan.steps.find((step) => step.status === "requires_user_review");
  if (reviewStep?.output?.fusionBootstrap) {
    const fusionPkg: AssistantPrefillPackage = {
      ...nextPkg,
      intent: reviewStep.actionId === "prepare_outfit" ? "fusion_outfit" : "generic",
      actionId:
        reviewStep.actionId === "prepare_motion_character"
          ? "prepare_motion_character"
          : reviewStep.actionId === "prepare_outfit"
            ? "create_fusion"
            : nextPkg.actionId,
      fusion: {
        fusionIntent: String(reviewStep.output.fusionBootstrap.fusionIntent ?? ""),
        fusionArchetype: String(reviewStep.output.fusionBootstrap.fusionArchetype ?? ""),
        outputSettings: nextPkg.outputSettings,
      },
    };
    storeAssistantEditorFusionBootstrap(fusionPkg);
  }

  return { pkg: nextPkg, plan };
}

export function confirmAssistantExecutionPlan(
  pkg: AssistantPrefillPackage,
  plan: AssistantExecutionPlan
): AssistantExecutionPlan {
  return {
    ...plan,
    status: "planned",
    confirmedAt: new Date().toISOString(),
    steps: plan.steps.map((step) => ({
      ...step,
      status: step.executionMode === "auto_safe" ? "planned" : "planned",
    })),
  };
}

export async function buildExecutionPlanForPrefill(input: {
  pkg: AssistantPrefillPackage;
  activeProject?: { id: string; title?: string } | null;
}): Promise<AssistantExecutionPlan | null> {
  return buildAssistantExecutionPlan({
    pkg: input.pkg,
    activeProjectId: input.activeProject?.id ?? null,
    confirmed: false,
  });
}
