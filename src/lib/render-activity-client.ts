import type { CancelCreditSummary } from "@/lib/render-cancel-credits";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

export type ProjectRenderActionResponse = {
  ok: boolean;
  projectId: string;
  projectStatus?: string;
  message?: string;
  providerCancelAttempted?: boolean;
  providerCancelSupported?: boolean;
  credits?: CancelCreditSummary;
  status?: InstantPremiumStatusResponse;
  repaired?: Record<string, unknown>;
  project?: unknown;
  error?: string;
};

async function postRenderAction(
  projectId: string,
  action: "cancel" | "retry" | "repair-status" | "refresh-provider-status",
  body?: unknown
): Promise<{ ok: boolean; status: number; data: ProjectRenderActionResponse }> {
  try {
    const res = await fetch(
      `/api/animations/projects/${encodeURIComponent(projectId)}/${action}`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: body != null ? JSON.stringify(body) : undefined,
      }
    );
    const data = (await res.json().catch(() => ({}))) as ProjectRenderActionResponse;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { ok: false, projectId, error: "Network error." },
    };
  }
}

export function postCancelProjectRender(
  projectId: string,
  options?: { forceLocal?: boolean }
) {
  return postRenderAction(projectId, "cancel", options);
}

export function postRetryProjectRender(projectId: string) {
  return postRenderAction(projectId, "retry");
}

export function postRepairProjectStatus(projectId: string) {
  return postRenderAction(projectId, "repair-status");
}

export function postRefreshProviderStatus(projectId: string) {
  return postRenderAction(projectId, "refresh-provider-status");
}
