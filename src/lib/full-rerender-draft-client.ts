import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import {
  isDraftStorageUnavailableResponse,
  FULL_RERENDER_DRAFT_CODES,
} from "@/lib/full-rerender-draft-api-codes";
import type { PersistedFullRerenderDraftPayload } from "@/lib/full-rerender-draft";
import type { DraftFetchOutcome } from "@/lib/full-rerender-draft-bootstrap";

export function fullRerenderDraftPath(projectId: string): string {
  return sameOriginApiPath(
    `/api/instant-premium/projects/${encodeURIComponent(projectId)}/full-rerender-draft`
  );
}

type DraftApiBody = {
  ok?: boolean;
  draft?: PersistedFullRerenderDraftPayload | null;
  updatedAt?: string | null;
  error?: string;
  code?: string;
};

function toFetchOutcome(result: {
  ok: boolean;
  status: number;
  data: DraftApiBody;
  networkError: boolean;
}): DraftFetchOutcome {
  if (result.networkError) {
    return {
      ok: false,
      status: 0,
      draft: null,
      updatedAt: null,
      error: result.data.error ?? "Network error.",
    };
  }
  return {
    ok: result.ok,
    status: result.status,
    draft: result.data.draft ?? null,
    updatedAt: result.data.updatedAt ?? null,
    code: result.data.code,
    error: result.data.error,
  };
}

export async function fetchFullRerenderDraft(projectId: string): Promise<
  DraftFetchOutcome & { storageUnavailable: boolean }
> {
  const result = await fetchSameOriginJson<DraftApiBody>(fullRerenderDraftPath(projectId));
  const outcome = toFetchOutcome(result);
  return {
    ...outcome,
    storageUnavailable: isDraftStorageUnavailableResponse(outcome.status, outcome),
  };
}

export async function ensureFullRerenderDraft(projectId: string): Promise<
  DraftFetchOutcome & { storageUnavailable: boolean }
> {
  const result = await fetchSameOriginJson<DraftApiBody>(fullRerenderDraftPath(projectId), {
    method: "POST",
  });
  const outcome = toFetchOutcome(result);
  return {
    ...outcome,
    storageUnavailable: isDraftStorageUnavailableResponse(outcome.status, outcome),
  };
}

export async function saveFullRerenderDraft(
  projectId: string,
  payload: PersistedFullRerenderDraftPayload
): Promise<{
  ok: boolean;
  updatedAt: string | null;
  error?: string;
  storageUnavailable?: boolean;
  code?: string;
}> {
  const result = await fetchSameOriginJson<DraftApiBody>(fullRerenderDraftPath(projectId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  if (result.networkError) {
    return { ok: false, updatedAt: null, error: result.data.error ?? "Save failed." };
  }
  if (isDraftStorageUnavailableResponse(result.status, result.data)) {
    return {
      ok: false,
      updatedAt: null,
      error: result.data.error,
      storageUnavailable: true,
      code: FULL_RERENDER_DRAFT_CODES.STORAGE_UNAVAILABLE,
    };
  }
  if (!result.ok) {
    return {
      ok: false,
      updatedAt: null,
      error: result.data.error ?? `HTTP ${result.status}`,
      code: result.data.code,
    };
  }
  return { ok: true, updatedAt: result.data.updatedAt ?? null };
}

export async function deleteFullRerenderDraftClient(
  projectId: string
): Promise<{ ok: boolean; error?: string; storageUnavailable?: boolean }> {
  const result = await fetchSameOriginJson<DraftApiBody>(fullRerenderDraftPath(projectId), {
    method: "DELETE",
  });
  if (result.networkError) {
    return { ok: false, error: result.data.error ?? "Delete failed." };
  }
  if (isDraftStorageUnavailableResponse(result.status, result.data)) {
    return {
      ok: false,
      error: result.data.error,
      storageUnavailable: true,
    };
  }
  if (!result.ok) {
    return { ok: false, error: result.data.error ?? `HTTP ${result.status}` };
  }
  return { ok: true };
}
