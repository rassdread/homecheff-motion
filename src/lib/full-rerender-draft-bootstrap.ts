import {
  isDraftStorageUnavailableResponse,
  type FullRerenderDraftApiCode,
} from "@/lib/full-rerender-draft-api-codes";
import type { PersistedFullRerenderDraftPayload } from "@/lib/full-rerender-draft";

export type DraftFetchOutcome = {
  ok: boolean;
  status: number;
  draft: PersistedFullRerenderDraftPayload | null;
  updatedAt: string | null;
  code?: FullRerenderDraftApiCode | string;
  error?: string;
};

export type DraftBootstrapPlan =
  | {
      kind: "ready";
      draft: PersistedFullRerenderDraftPayload;
      updatedAt: string | null;
      source: "get" | "post";
    }
  | { kind: "storage_unavailable" }
  | { kind: "fallback"; error?: string };

/**
 * Decide how the editor should boot from GET (+ optional POST) results.
 * Never schedules retries — callers invoke fetch at most once per step.
 */
export function planFullRerenderDraftBootstrap(
  get: DraftFetchOutcome,
  post?: DraftFetchOutcome
): DraftBootstrapPlan | { kind: "needs_create" } {
  if (isDraftStorageUnavailableResponse(get.status, get)) {
    return { kind: "storage_unavailable" };
  }

  if (get.ok && get.draft) {
    return {
      kind: "ready",
      draft: get.draft,
      updatedAt: get.updatedAt,
      source: "get",
    };
  }

  if (!get.ok) {
    return {
      kind: "fallback",
      error: get.error ?? `HTTP ${get.status}`,
    };
  }

  if (!post) {
    return { kind: "needs_create" };
  }

  if (isDraftStorageUnavailableResponse(post.status, post)) {
    return { kind: "storage_unavailable" };
  }

  if (post.ok && post.draft) {
    return {
      kind: "ready",
      draft: post.draft,
      updatedAt: post.updatedAt,
      source: "post",
    };
  }

  return {
    kind: "fallback",
    error: post.error ?? `HTTP ${post.status}`,
  };
}
