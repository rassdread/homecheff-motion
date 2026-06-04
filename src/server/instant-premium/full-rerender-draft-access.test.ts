import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("full-rerender-draft-access", () => {
  it("draft route uses slim access verify instead of full project include", () => {
    const route = readFileSync(
      join(
        process.cwd(),
        "src/app/api/instant-premium/projects/[id]/full-rerender-draft/route.ts"
      ),
      "utf8"
    );
    assert.doesNotMatch(route, /getAnimationProjectByIdForViewer/);
    assert.match(route, /verifyInstantProjectDraftAccess/);
    assert.match(route, /getInstantProjectForDraftEnsure/);
  });

  it("GET handler loads draft meta after access verify only", () => {
    const route = readFileSync(
      join(
        process.cwd(),
        "src/app/api/instant-premium/projects/[id]/full-rerender-draft/route.ts"
      ),
      "utf8"
    );
    const getBlock = route.slice(route.indexOf("export async function GET"));
    const nextExport = getBlock.indexOf("export async function PUT");
    const getOnly = getBlock.slice(0, nextExport > 0 ? nextExport : undefined);
    assert.match(getOnly, /verifyInstantProjectDraftAccess/);
    assert.match(getOnly, /getFullRerenderDraftMeta/);
    assert.doesNotMatch(getOnly, /getInstantProjectForDraftEnsure/);
  });
});
