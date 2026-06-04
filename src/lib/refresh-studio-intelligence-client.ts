import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type {
  ProjectStudioQaResponse,
  RefreshStudioIntelligenceOptions,
  StudioIntelligenceStalenessResult,
  StudioRefreshAuditEntry,
} from "@/types/studio-project-persistence";

export type RefreshStudioIntelligenceResponse =
  | {
      ok: true;
      projectId: string;
      studioQa: ProjectStudioQaResponse;
      audit: StudioRefreshAuditEntry;
      stalenessBefore: StudioIntelligenceStalenessResult;
    }
  | { ok: false; code?: string; error: string };

export type StudioIntelligenceStaleResponse =
  | {
      ok: true;
      staleness: StudioIntelligenceStalenessResult;
      studioQa: ProjectStudioQaResponse | null;
    }
  | { ok: false; code?: string; error: string };

export async function postRefreshStudioIntelligence(
  projectId: string,
  options?: RefreshStudioIntelligenceOptions
) {
  return fetchSameOriginJson<RefreshStudioIntelligenceResponse>(
    sameOriginApiPath(
      `/api/instant-premium/projects/${encodeURIComponent(projectId)}/refresh-studio-intelligence`
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options ?? { refreshQa: true }),
    }
  );
}

export async function fetchStudioIntelligenceStale(
  projectId: string,
  persistHint = false
) {
  const qs = persistHint ? "?persistHint=1" : "";
  return fetchSameOriginJson<StudioIntelligenceStaleResponse>(
    sameOriginApiPath(
      `/api/instant-premium/projects/${encodeURIComponent(projectId)}/studio-intelligence-stale${qs}`
    )
  );
}
