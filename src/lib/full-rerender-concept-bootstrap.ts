import {
  planFullRerenderDraftBootstrap,
  type DraftFetchOutcome,
} from "@/lib/full-rerender-draft-bootstrap";
import {
  draftPayloadToEditorSlots,
  type PersistedFullRerenderDraftPayload,
} from "@/lib/full-rerender-draft";
import type { FullRerenderEditorSlot } from "@/lib/full-rerender-editor-types";
import type { FullRerenderDraftBootstrapDiagnostics } from "@/lib/full-rerender-draft-diagnostics";
import { traceConceptFlow } from "@/lib/concept-flow-trace";

export type ConceptBootstrapResult =
  | {
      status: "ready";
      draft: PersistedFullRerenderDraftPayload;
      slots: FullRerenderEditorSlot[];
      expandedIndex: number | null;
      versionNote: string;
      userIntent: string;
      transitionSeconds: number;
      draftPersisted: boolean;
      diagnostics: FullRerenderDraftBootstrapDiagnostics;
    }
  | {
      status: "error";
      error: string;
      slots: FullRerenderEditorSlot[];
      expandedIndex: number | null;
      versionNote: string;
      userIntent: string;
      transitionSeconds: number;
      diagnostics: FullRerenderDraftBootstrapDiagnostics;
    }
  | {
      status: "storage_unavailable";
      diagnostics: FullRerenderDraftBootstrapDiagnostics;
    };

export type ConceptBootstrapDeps = {
  projectId: string;
  buildLocalDraft: () => PersistedFullRerenderDraftPayload;
  fetchGet: (projectId: string) => Promise<DraftFetchOutcome>;
  fetchPost: (projectId: string) => Promise<DraftFetchOutcome>;
};

function outcomeFromDraft(
  draft: PersistedFullRerenderDraftPayload,
  diagnostics: FullRerenderDraftBootstrapDiagnostics,
  draftPersisted: boolean
): ConceptBootstrapResult {
  const slots = draftPayloadToEditorSlots(draft);
  return {
    status: "ready",
    draft,
    slots,
    expandedIndex: draft.expandedIndex,
    versionNote: draft.versionNote,
    userIntent: draft.userIntent,
    transitionSeconds: draft.transitionSeconds,
    draftPersisted,
    diagnostics,
  };
}

function outcomeFromLocal(
  projectId: string,
  draft: PersistedFullRerenderDraftPayload,
  diagnostics: FullRerenderDraftBootstrapDiagnostics,
  draftPersisted: boolean
): ConceptBootstrapResult {
  traceConceptFlow("bootstrap.local_fallback", { projectId, draftPersisted });
  return outcomeFromDraft(draft, diagnostics, draftPersisted);
}

/**
 * One-shot concept bootstrap: GET → optional POST → ready or error.
 * Never loops; POST at most once per invocation.
 */
export async function runFullRerenderConceptBootstrap(
  deps: ConceptBootstrapDeps
): Promise<ConceptBootstrapResult> {
  const { projectId, buildLocalDraft, fetchGet, fetchPost } = deps;

  traceConceptFlow("bootstrap.get.start", { projectId });
  const get = await fetchGet(projectId);
  traceConceptFlow("bootstrap.get.done", {
    projectId,
    status: get.status,
    ok: get.ok,
    hasDraft: Boolean(get.draft),
  });

  let postStatus: number | null = null;
  let postOk: boolean | null = null;
  let postCode: string | undefined;

  let plan = planFullRerenderDraftBootstrap(get);

  if (plan.kind === "needs_create") {
    traceConceptFlow("bootstrap.post.start", { projectId });
    const post = await fetchPost(projectId);
    postStatus = post.status;
    postOk = post.ok;
    postCode = post.code;
    traceConceptFlow("bootstrap.post.done", {
      projectId,
      status: post.status,
      ok: post.ok,
      hasDraft: Boolean(post.draft),
    });
    plan = planFullRerenderDraftBootstrap(get, post);

    if (plan.kind === "fallback" && get.ok && !get.draft) {
      const local = buildLocalDraft();
      const diagnostics: FullRerenderDraftBootstrapDiagnostics = {
        getStatus: get.status,
        getOk: get.ok,
        getCode: get.code,
        postStatus,
        postOk,
        postCode,
      };
      return outcomeFromLocal(projectId, local, diagnostics, false);
    }
  }

  const diagnostics: FullRerenderDraftBootstrapDiagnostics = {
    getStatus: get.status,
    getOk: get.ok,
    getCode: get.code,
    postStatus,
    postOk,
    postCode,
  };

  if (plan.kind === "storage_unavailable") {
    return { status: "storage_unavailable", diagnostics };
  }

  if (plan.kind === "ready") {
    traceConceptFlow("bootstrap.ready", {
      projectId,
      source: plan.source,
      slotsCount: plan.draft.slots.length,
    });
    return outcomeFromDraft(plan.draft, diagnostics, true);
  }

  if (plan.kind === "fallback") {
    const local = buildLocalDraft();
    const slots = draftPayloadToEditorSlots(local);
    traceConceptFlow("bootstrap.error_with_local_slots", {
      projectId,
      error: plan.error,
      slotsCount: slots.length,
    });
    return {
      status: "error",
      error: plan.error ?? "Concept load failed.",
      slots,
      expandedIndex: local.expandedIndex,
      versionNote: local.versionNote,
      userIntent: local.userIntent,
      transitionSeconds: local.transitionSeconds,
      diagnostics,
    };
  }

  const local = buildLocalDraft();
  return {
    status: "error",
    error: "Concept load failed.",
    slots: draftPayloadToEditorSlots(local),
    expandedIndex: local.expandedIndex,
    versionNote: local.versionNote,
    userIntent: local.userIntent,
    transitionSeconds: local.transitionSeconds,
    diagnostics,
  };
}

export function hasUsableConceptSlots(slots: FullRerenderEditorSlot[]): boolean {
  return slots.some((slot) => slot.image !== null && slot.image.previewUrl.trim().length > 0);
}
