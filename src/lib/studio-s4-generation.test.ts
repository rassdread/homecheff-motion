/**
 * S.4 generation orchestration — pure contracts + fake adapter + source gates.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  STUDIO_GENERATION_CAPABILITY_REGISTRY,
  STUDIO_GENERATION_CAPABILITIES,
} from "@/lib/studio-generation-capabilities";
import {
  isStudioGenerationInFlight,
  isStudioGenerationTerminal,
  mapLegacyStatusToStudioGeneration,
  STUDIO_GENERATION_STATUSES,
} from "@/lib/studio-generation-status";
import { safeStudioGenerationErrorMessage } from "@/lib/studio-generation-errors";
import { createFakeProviderAdapter } from "@/server/studio-generation/fake-provider-adapter";
import { hashStudioGenerationInput } from "@/server/studio-generation/generation-job-hash";
import { SCENE_GENERATION_DISPLAY_CREDITS } from "@/lib/studio-credit-constants";
import { STUDIO_ACTION_COST_REGISTRY } from "@/server/studio-account/studio-action-cost-registry";

describe("S.4 status model", () => {
  it("defines canonical statuses", () => {
    assert.ok(STUDIO_GENERATION_STATUSES.includes("generating"));
    assert.ok(STUDIO_GENERATION_STATUSES.includes("succeeded"));
    assert.equal(isStudioGenerationTerminal("succeeded"), true);
    assert.equal(isStudioGenerationInFlight("generating"), true);
  });

  it("maps legacy statuses", () => {
    assert.equal(mapLegacyStatusToStudioGeneration("running"), "generating");
    assert.equal(mapLegacyStatusToStudioGeneration("completed"), "succeeded");
    assert.equal(mapLegacyStatusToStudioGeneration("queued"), "queued");
  });
});

describe("S.4 capability registry", () => {
  it("covers core capabilities with actionTypes", () => {
    assert.ok(STUDIO_GENERATION_CAPABILITIES.includes("IMAGE_GENERATE"));
    assert.equal(
      STUDIO_GENERATION_CAPABILITY_REGISTRY.IMAGE_GENERATE.actionType,
      "scene_generation"
    );
    assert.equal(STUDIO_GENERATION_CAPABILITY_REGISTRY.VOICE_TTS.targetScope, "project");
    assert.equal(STUDIO_GENERATION_CAPABILITY_REGISTRY.IMAGE_GENERATE.targetScope, "scene");
  });

  it("image capability cost matches registry", () => {
    assert.equal(
      STUDIO_ACTION_COST_REGISTRY.scene_generation.defaultCreditCost,
      SCENE_GENERATION_DISPLAY_CREDITS
    );
  });
});

describe("S.4 fake adapter harness", () => {
  it("sync success returns result", async () => {
    const adapter = createFakeProviderAdapter("success");
    const started = await adapter.start({
      generationJobId: "job1",
      idempotencyKey: "k1",
      payload: {},
    });
    assert.ok(started.syncResult?.outputAssetId);
  });

  it("async success progresses to succeeded", async () => {
    const adapter = createFakeProviderAdapter("async_success");
    const started = await adapter.start({
      generationJobId: "job2",
      idempotencyKey: "k2",
      payload: {},
    });
    assert.ok(started.providerJobId);
    await new Promise((r) => setTimeout(r, 60));
    const status = await adapter.getStatus!(started.providerJobId!);
    assert.equal(status.studioStatus, "succeeded");
  });

  it("failure throws", async () => {
    const adapter = createFakeProviderAdapter("failure");
    await assert.rejects(() =>
      adapter.start({ generationJobId: "j", idempotencyKey: "k", payload: {} })
    );
  });
});

describe("S.4 input hash + errors", () => {
  it("hashes deterministically", () => {
    const a = hashStudioGenerationInput({ sceneId: "s1", storyboardId: "b1" });
    const b = hashStudioGenerationInput({ sceneId: "s1", storyboardId: "b1" });
    assert.equal(a, b);
    assert.notEqual(a, hashStudioGenerationInput({ sceneId: "s2", storyboardId: "b1" }));
  });

  it("safe error messages omit internals", () => {
    assert.match(safeStudioGenerationErrorMessage("STORAGE_FAILED"), /not recharged/i);
    assert.doesNotMatch(safeStudioGenerationErrorMessage("INTERNAL_ERROR"), /stack/i);
  });
});

describe("S.4 wiring contracts", () => {
  it("scene image route uses orchestrator + idempotency", () => {
    const route = readFileSync(
      join(
        process.cwd(),
        "src/app/api/studio/storyboards/[id]/scenes/[sceneId]/images/route.ts"
      ),
      "utf8"
    );
    assert.match(route, /createGenerationJob/);
    assert.match(route, /idempotencyKey/);
    assert.match(route, /billProviderAction/);
    assert.match(route, /sceneId/);
  });

  it("bulk StudioJob runner bills scene generation", () => {
    const runner = readFileSync(
      join(process.cwd(), "src/server/studio/studio-job-runner.ts"),
      "utf8"
    );
    assert.match(runner, /billedSceneImageGenerate/);
    assert.match(runner, /billProviderAction/);
    assert.match(runner, /improve_weak_scenes/);
  });

  it("generation job status endpoint is owner-scoped", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/studio/generation-jobs/[jobId]/route.ts"),
      "utf8"
    );
    assert.match(route, /getAuthorizedGenerationJob/);
  });
});
