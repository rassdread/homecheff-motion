import { applyProductionConfigForExport } from "@/lib/publish-media-production";
import { applyChangePlanToPublishProject } from "@/lib/publish-change-plan-apply";
import { loadPublishChangePlanFromMetadata } from "@/lib/publish-change-plan-apply";
import { applyTimelineToPublishProject, loadPublishTimelineFromProject, timelineHasPendingRender } from "@/lib/publish-timeline";
import { resolvePublishOrientation } from "@/lib/publish-safe-zone-v2";
import type { PublishProject } from "@/types/publish-overlay";

export async function exportPublishProject(
  project: PublishProject,
  options?: { productionTransactionId?: string; hcProjectId?: string }
): Promise<{ ok: boolean; downloadUrl?: string; errorKey?: string }> {
  let exportProject = project;
  const changePlan = loadPublishChangePlanFromMetadata(project);
  if (changePlan) {
    const aspect = project.videoUrl ? 16 / 9 : 9 / 16;
    exportProject = applyChangePlanToPublishProject(project, changePlan, {
      orientation: resolvePublishOrientation(aspect),
    });
  }
  if (timelineHasPendingRender(loadPublishTimelineFromProject(exportProject))) {
    exportProject = applyTimelineToPublishProject(exportProject);
  }
  exportProject = applyProductionConfigForExport(exportProject);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options?.productionTransactionId?.trim()) {
      headers["x-production-transaction-id"] = options.productionTransactionId.trim();
    }
    if (options?.hcProjectId?.trim()) {
      headers["x-hc-project-id"] = options.hcProjectId.trim();
    }
    const res = await fetch("/api/publish/export", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ project: exportProject }),
    });
    if (!res.ok) {
      return { ok: false, errorKey: "publish.exportFallback" };
    }
    const blob = await res.blob();
    const downloadUrl = URL.createObjectURL(blob);
    return { ok: true, downloadUrl };
  } catch {
    return { ok: false, errorKey: "publish.exportFallback" };
  }
}
