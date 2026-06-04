import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type { PersistedFullRerenderDraftPayload } from "@/lib/full-rerender-draft";

export function fullRerenderDraftPath(projectId: string): string {
  return sameOriginApiPath(
    `/api/instant-premium/projects/${encodeURIComponent(projectId)}/full-rerender-draft`
  );
}

export async function fetchFullRerenderDraft(projectId: string): Promise<{
  draft: PersistedFullRerenderDraftPayload | null;
  updatedAt: string | null;
  networkError: boolean;
  error?: string;
}> {
  const result = await fetchSameOriginJson<{
    draft?: PersistedFullRerenderDraftPayload | null;
    updatedAt?: string | null;
    error?: string;
  }>(fullRerenderDraftPath(projectId));

  if (result.networkError) {
    return { draft: null, updatedAt: null, networkError: true, error: result.data.error };
  }
  if (!result.ok) {
    return {
      draft: null,
      updatedAt: null,
      networkError: false,
      error: result.data.error ?? `HTTP ${result.status}`,
    };
  }
  return {
    draft: result.data.draft ?? null,
    updatedAt: result.data.updatedAt ?? null,
    networkError: false,
  };
}

export async function ensureFullRerenderDraft(projectId: string): Promise<{
  draft: PersistedFullRerenderDraftPayload | null;
  updatedAt: string | null;
  ok: boolean;
  error?: string;
}> {
  const result = await fetchSameOriginJson<{
    draft?: PersistedFullRerenderDraftPayload | null;
    updatedAt?: string | null;
    error?: string;
  }>(fullRerenderDraftPath(projectId), { method: "POST" });

  if (!result.ok || result.networkError) {
    return {
      draft: null,
      updatedAt: null,
      ok: false,
      error: result.data.error ?? "Could not create draft.",
    };
  }
  return {
    draft: result.data.draft ?? null,
    updatedAt: result.data.updatedAt ?? null,
    ok: Boolean(result.data.draft),
  };
}

export async function saveFullRerenderDraft(
  projectId: string,
  payload: PersistedFullRerenderDraftPayload
): Promise<{ ok: boolean; updatedAt: string | null; error?: string }> {
  const result = await fetchSameOriginJson<{ ok?: boolean; updatedAt?: string; error?: string }>(
    fullRerenderDraftPath(projectId),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
    }
  );
  if (!result.ok || result.networkError) {
    return { ok: false, updatedAt: null, error: result.data.error ?? "Save failed." };
  }
  return { ok: true, updatedAt: result.data.updatedAt ?? null };
}

export async function deleteFullRerenderDraftClient(
  projectId: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await fetchSameOriginJson<{ ok?: boolean; error?: string }>(
    fullRerenderDraftPath(projectId),
    { method: "DELETE" }
  );
  if (!result.ok || result.networkError) {
    return { ok: false, error: result.data.error ?? "Delete failed." };
  }
  return { ok: true };
}
