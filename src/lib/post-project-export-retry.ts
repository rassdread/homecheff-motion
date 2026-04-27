import type { ExportRouteResponse } from "@/types/animation-api";
import { hcExportRetryLog } from "@/lib/hc-export-retry-debug";

/** POST /api/animations/projects/:id/export/retry — clears stuck export state and restarts merge. */
export async function postProjectExportRetry(projectId: string): Promise<{
  response: Response;
  body: ExportRouteResponse;
}> {
  hcExportRetryLog("client", "export_retry.request_start", { projectId });
  const response = await fetch(
    `/api/animations/projects/${encodeURIComponent(projectId)}/export/retry`,
    { method: "POST", credentials: "include" }
  );
  const body = (await response.json().catch(() => ({}))) as ExportRouteResponse;
  hcExportRetryLog("client", "export_retry.response", {
    projectId,
    httpStatus: response.status,
    ok: response.ok,
    hasProject: Boolean(body.project),
    error: body.error ?? null,
  });
  return { response, body };
}
