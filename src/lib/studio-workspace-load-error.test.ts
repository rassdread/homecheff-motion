import assert from "node:assert/strict";
import test from "node:test";
import { resolveStudioWorkspaceLoadFailure } from "@/lib/studio-workspace-load-error";

test("resolveStudioWorkspaceLoadFailure returns null on ok", () => {
  assert.equal(
    resolveStudioWorkspaceLoadFailure(
      { ok: true, status: 200, data: {}, networkError: false },
      "fallback"
    ),
    null
  );
});

test("resolveStudioWorkspaceLoadFailure maps access-control network errors", () => {
  const failure = resolveStudioWorkspaceLoadFailure(
    {
      ok: false,
      status: 0,
      data: { error: "blocked" },
      networkError: true,
      accessControl: true,
    },
    "fallback"
  );
  assert.equal(failure?.kind, "network");
  assert.equal(failure?.accessControl, true);
  assert.equal(failure?.message, "blocked");
});

test("resolveStudioWorkspaceLoadFailure maps 401 to auth", () => {
  const failure = resolveStudioWorkspaceLoadFailure(
    {
      ok: false,
      status: 401,
      data: { error: "Authentication required.", code: "AUTH_REQUIRED" },
      networkError: false,
    },
    "fallback"
  );
  assert.equal(failure?.kind, "auth");
});
