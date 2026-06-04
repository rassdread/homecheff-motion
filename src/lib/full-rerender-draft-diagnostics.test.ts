import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDraftBootstrapDiagnostics } from "@/lib/full-rerender-draft-diagnostics";

describe("full-rerender-draft-diagnostics", () => {
  it("formats GET failure and POST failure lines", () => {
    const lines = formatDraftBootstrapDiagnostics({
      getStatus: 500,
      getOk: false,
      getCode: "FULL_RERENDER_DRAFT_FAILED",
      postStatus: 500,
      postOk: false,
      postCode: "FULL_RERENDER_DRAFT_FAILED",
    });
    assert.match(lines.join("\n"), /Draft GET failed/);
    assert.match(lines.join("\n"), /Status: 500/);
    assert.match(lines.join("\n"), /Draft POST failed/);
  });

  it("formats successful GET with POST create", () => {
    const lines = formatDraftBootstrapDiagnostics({
      getStatus: 200,
      getOk: true,
      postStatus: 200,
      postOk: true,
    });
    assert.match(lines.join("\n"), /Draft GET: OK \(200\)/);
    assert.match(lines.join("\n"), /Draft POST: OK \(200\)/);
  });
});
