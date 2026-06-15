import {
  runLiveReferenceRoleAnalysis,
  type ReferenceRoleAnalysisResult,
} from "@/lib/editor-reference-role-analysis";
import type {
  EditorReferenceIntakeState,
  EditorReferenceRoleInstance,
  EditorReferenceRoleSpec,
} from "@/types/editor-reference-role-flow";

export type ReferenceAnalysisJob = {
  roleSpec: EditorReferenceRoleSpec;
  instance: EditorReferenceRoleInstance;
};

export function collectQueuedReferenceAnalysisJobs(
  state: EditorReferenceIntakeState,
  startedIds: ReadonlySet<string>
): ReferenceAnalysisJob[] {
  const jobs: ReferenceAnalysisJob[] = [];
  for (const slot of state.slots) {
    const roleSpec = state.config.roles.find((role) => role.id === slot.roleId);
    if (!roleSpec) {
      continue;
    }
    for (const instance of slot.instances) {
      if (instance.analysis.status !== "queued" || startedIds.has(instance.instanceId)) {
        continue;
      }
      jobs.push({ roleSpec, instance });
    }
  }
  return jobs;
}

export function patchReferenceInstanceAnalysis(
  state: EditorReferenceIntakeState,
  instanceId: string,
  result: ReferenceRoleAnalysisResult
): EditorReferenceIntakeState {
  return {
    ...state,
    slots: state.slots.map((slot) => ({
      ...slot,
      instances: slot.instances.map((item) =>
        item.instanceId === instanceId
          ? { ...item, document: result.document, analysis: result.analysis }
          : item
      ),
    })),
  };
}

export function markReferenceInstancesAnalysisStatus(
  state: EditorReferenceIntakeState,
  instanceIds: string[],
  status: "running" | "queued"
): EditorReferenceIntakeState {
  const idSet = new Set(instanceIds);
  return {
    ...state,
    slots: state.slots.map((slot) => ({
      ...slot,
      instances: slot.instances.map((item) =>
        idSet.has(item.instanceId) ? { ...item, analysis: { status } } : item
      ),
    })),
  };
}

export function referenceAnalysisProgress(state: EditorReferenceIntakeState): {
  total: number;
  finished: number;
  pending: number;
} {
  const instances = state.slots.flatMap((slot) => slot.instances);
  const total = instances.length;
  const finished = instances.filter((item) =>
    ["done", "error", "needs_attention"].includes(item.analysis.status)
  ).length;
  const pending = instances.filter((item) =>
    ["queued", "running", "uploading"].includes(item.analysis.status)
  ).length;
  return { total, finished, pending };
}

export async function runReferenceAnalysesInParallel(
  jobs: ReferenceAnalysisJob[],
  onJobStart: (instanceId: string) => void,
  onJobComplete: (instanceId: string, result: ReferenceRoleAnalysisResult) => void
): Promise<void> {
  if (jobs.length === 0) {
    return;
  }

  for (const job of jobs) {
    onJobStart(job.instance.instanceId);
  }

  await Promise.allSettled(
    jobs.map(async (job) => {
      const result = await runLiveReferenceRoleAnalysis(job.instance.document, job.roleSpec);
      onJobComplete(job.instance.instanceId, result);
    })
  );
}
