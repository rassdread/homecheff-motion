import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveRenderTypeForProject,
  resolveViduBillingContext,
} from "@/server/provider-usage/provider-usage-log";

describe("resolveRenderTypeForProject", () => {
  it("returns full_rerender when audit is running", () => {
    const audit = {
      fullRerender: {
        rebuildType: "full_rerender",
        status: "running",
        startedAt: "2026-01-01T00:00:00.000Z",
        newProviderJobsCreated: true,
      },
      pendingFullRerender: {
        renderVersionId: "rv-1",
        renderVersionNumber: 2,
        startedAt: "2026-01-01T00:00:00.000Z",
      },
    };
    assert.equal(
      resolveRenderTypeForProject({
        projectType: "instant_premium",
        instantMode: "transition",
        sourceProjectId: null,
        instantFinalRebuildAuditJson: audit,
      }),
      "full_rerender"
    );
  });

  it("returns story_mode for initial story projects", () => {
    assert.equal(
      resolveRenderTypeForProject({
        projectType: "instant_premium",
        instantMode: "story",
        sourceProjectId: null,
      }),
      "story_mode"
    );
  });

  it("resolveViduBillingContext includes render version from pending audit", () => {
    const ctx = resolveViduBillingContext({
      projectType: "instant_premium",
      instantMode: "story",
      sourceProjectId: null,
      instantFinalRebuildAuditJson: {
        fullRerender: {
          rebuildType: "full_rerender",
          status: "running",
          startedAt: "2026-01-01T00:00:00.000Z",
          newProviderJobsCreated: true,
        },
        pendingFullRerender: {
          renderVersionId: "rv-99",
          renderVersionNumber: 3,
          startedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    });
    assert.equal(ctx.renderType, "full_rerender");
    assert.equal(ctx.renderVersionId, "rv-99");
    assert.equal(ctx.renderVersionNumber, 3);
  });
});
