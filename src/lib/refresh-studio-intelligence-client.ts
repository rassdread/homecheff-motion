import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type {
  ProjectStudioQaResponse,
  RefreshStudioIntelligenceOptions,
  StudioIntelligenceStalenessResult,
  StudioRefreshAuditEntry,
} from "@/types/studio-project-persistence";
import type {
  StudioMotionSyncApplyInput,
  StudioMotionSyncPreview,
  StudioSyncAuditEntry,
} from "@/types/studio-motion-sync";

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

export type StudioSyncPreviewResponse =
  | { ok: true; preview: StudioMotionSyncPreview }
  | { ok: false; code?: string; error: string };

export type StudioSyncApplyResponse =
  | {
      ok: true;
      projectId: string;
      preview: StudioMotionSyncPreview;
      audit: StudioSyncAuditEntry;
      studioQa: ProjectStudioQaResponse | null;
    }
  | { ok: false; code?: string; error: string };

export async function fetchStudioSyncPreview(projectId: string) {
  return fetchSameOriginJson<StudioSyncPreviewResponse>(
    sameOriginApiPath(
      `/api/instant-premium/projects/${encodeURIComponent(projectId)}/studio-sync-preview`
    )
  );
}

export async function postSyncFromStudio(
  projectId: string,
  input: StudioMotionSyncApplyInput
) {
  return fetchSameOriginJson<StudioSyncApplyResponse>(
    sameOriginApiPath(
      `/api/instant-premium/projects/${encodeURIComponent(projectId)}/sync-from-studio`
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
}
