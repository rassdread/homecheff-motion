import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasUsableConceptSlots,
  runFullRerenderConceptBootstrap,
} from "@/lib/full-rerender-concept-bootstrap";
import {
  buildInitialFullRerenderDraftPayload,
  serializeFullRerenderDraftPayload,
} from "@/lib/full-rerender-draft";
import type { DraftFetchOutcome } from "@/lib/full-rerender-draft-bootstrap";
import { buildFullRerenderSlotsFromProject } from "@/lib/full-rerender-editor-slots";

describe("full-rerender-concept-bootstrap", () => {
  const projectId = "proj_test";
  const localDraft = () =>
    buildInitialFullRerenderDraftPayload({
      images: [{ id: "a", previewUrl: "https://cdn.example/a.jpg" }],
      instantSceneTexts: null,
      instantTransitionSeconds: 5,
      instantMode: "transition",
    });

  it("GET null then POST create → ready with persisted draft", async () => {
    let postCalls = 0;
    const payload = localDraft();
    const result = await runFullRerenderConceptBootstrap({
      projectId,
      buildLocalDraft: localDraft,
      fetchGet: async () => ({
        ok: true,
        status: 200,
        draft: null,
        updatedAt: null,
      }),
      fetchPost: async () => {
        postCalls += 1;
        return {
          ok: true,
          status: 200,
          draft: payload,
          updatedAt: "2026-06-04T12:00:00.000Z",
        };
      },
    });
    assert.equal(postCalls, 1);
    assert.equal(result.status, "ready");
    if (result.status === "ready") {
      assert.equal(result.draftPersisted, true);
      assert.ok(result.slots.length > 0);
    }
  });

  it("GET existing draft → ready without POST", async () => {
    let postCalls = 0;
    const payload = localDraft();
    const result = await runFullRerenderConceptBootstrap({
      projectId,
      buildLocalDraft: localDraft,
      fetchGet: async () => ({
        ok: true,
        status: 200,
        draft: payload,
        updatedAt: "2026-06-04T11:00:00.000Z",
      }),
      fetchPost: async () => {
        postCalls += 1;
        return { ok: false, status: 500, draft: null, updatedAt: null };
      },
    });
    assert.equal(postCalls, 0);
    assert.equal(result.status, "ready");
  });

  it("GET 200 null + POST failure → error with local slots, not endless loading shape", async () => {
    const result = await runFullRerenderConceptBootstrap({
      projectId,
      buildLocalDraft: localDraft,
      fetchGet: async () => ({
        ok: true,
        status: 200,
        draft: null,
        updatedAt: null,
      }),
      fetchPost: async () => ({
        ok: false,
        status: 500,
        draft: null,
        updatedAt: null,
        error: "Server error",
      }),
    });
    assert.equal(result.status, "ready");
    if (result.status === "ready") {
      assert.equal(result.draftPersisted, false);
      assert.ok(result.slots.length > 0);
    }
  });

  it("GET failure → error banner payload with local slots", async () => {
    const result = await runFullRerenderConceptBootstrap({
      projectId,
      buildLocalDraft: localDraft,
      fetchGet: async () => ({
        ok: false,
        status: 500,
        draft: null,
        updatedAt: null,
        error: "GET failed",
      }),
      fetchPost: async () => ({
        ok: false,
        status: 500,
        draft: null,
        updatedAt: null,
      }),
    });
    assert.equal(result.status, "error");
    if (result.status === "error") {
      assert.ok(result.slots.length > 0);
      assert.match(result.error, /GET failed|Concept load failed/);
    }
  });

  it("empty image list still yields one text slot locally", () => {
    const slots = buildFullRerenderSlotsFromProject({
      images: [],
      instantSceneTexts: null,
      transitionSeconds: 5,
    });
    assert.equal(slots.length, 1);
    assert.equal(slots[0]?.image, null);
    assert.equal(hasUsableConceptSlots(slots), false);
  });

  it("parsed draft with empty slots still round-trips via serialize for POST body", () => {
    const payload = serializeFullRerenderDraftPayload({
      slots: [],
      versionNote: "",
      userIntent: "",
      transitionSeconds: 5,
      instantMode: "transition",
      expandedIndex: null,
      initialImageIds: [],
    });
    const needsPost: DraftFetchOutcome = {
      ok: true,
      status: 200,
      draft: null,
      updatedAt: null,
    };
    assert.equal(needsPost.draft, null);
    assert.ok(payload.slots.length === 0);
  });
});
