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
import { resolveStudioGenerationIdempotencyKey } from "@/lib/studio-generation-idempotency";
import { pollStudioGenerationJobUntilTerminal } from "@/lib/studio-generation-job-poll";
import { validateStudioRenderPrerequisites } from "@/server/studio-generation/render-input-validation";

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
    assert.equal(STUDIO_GENERATION_CAPABILITY_REGISTRY.VIDEO_GENERATE.executionMode, "async_poll");
    assert.equal(STUDIO_GENERATION_CAPABILITY_REGISTRY.FUSION_RENDER.actionType, "fusion_render");
  });

  it("image capability cost matches registry", () => {
    assert.equal(
      STUDIO_ACTION_COST_REGISTRY.scene_generation.defaultCreditCost,
      SCENE_GENERATION_DISPLAY_CREDITS
    );
  });

  it("classifies capability keys for cleanup (no silent delete)", () => {
    const classification: Record<string, "ACTIVE" | "FUTURE" | "LEGACY" | "ORPHAN"> = {
      IMAGE_GENERATE: "ACTIVE",
      VOICE_TTS: "ACTIVE",
      VIDEO_GENERATE: "ACTIVE",
      FUSION_RENDER: "ACTIVE",
      RENDER: "ACTIVE",
      IMAGE_EDIT: "FUTURE",
      VOICE_CLONE: "LEGACY",
      MUSIC_GENERATE: "LEGACY",
      SFX_GENERATE: "LEGACY",
      TRANSLATE: "LEGACY",
      SUBTITLE_GENERATE: "LEGACY",
      VISION_ANALYZE: "LEGACY",
    };
    for (const key of STUDIO_GENERATION_CAPABILITIES) {
      assert.ok(classification[key], `missing classification for ${key}`);
    }
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

  it("supports honest cancellation on fake adapter", async () => {
    const adapter = createFakeProviderAdapter("async_success");
    assert.equal(adapter.supportsCancellation, true);
    const started = await adapter.start({
      generationJobId: "job-cancel",
      idempotencyKey: "kc",
      payload: {},
    });
    const cancelled = await adapter.cancel!(started.providerJobId!);
    assert.equal(cancelled.ok, true);
  });
});

describe("S.4 input hash + errors + idempotency", () => {
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

  it("prefers header idempotency key", () => {
    const key = resolveStudioGenerationIdempotencyKey({
      headerKey: "hdr-1",
      clientMutationId: "mut-1",
      fallbackPrefix: "voice_tts:sb",
    });
    assert.equal(key, "hdr-1");
  });
});

describe("S.4 poller + render prerequisites", () => {
  it("polls until terminal with abort support", async () => {
    let n = 0;
    const final = await pollStudioGenerationJobUntilTerminal({
      jobId: "j1",
      initialDelayMs: 10,
      maxDelayMs: 20,
      fetchStatus: async () => {
        n += 1;
        return { jobId: "j1", status: n >= 2 ? "succeeded" : "generating" };
      },
    });
    assert.equal(final.status, "succeeded");
    assert.ok(n >= 2);
  });

  it("fails render when required inputs missing", () => {
    const bad = validateStudioRenderPrerequisites({
      hasScenes: true,
      hasSceneImages: false,
      voiceRequired: true,
      hasVoiceAudio: false,
      subtitlesRequired: false,
      hasSubtitles: false,
    });
    assert.equal(bad.ok, false);
    if (!bad.ok) {
      assert.ok(bad.missing.includes("scene_images"));
      assert.ok(bad.missing.includes("voice_audio"));
    }
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

  it("voice route uses orchestrator + frozen project scope", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/studio/storyboards/[id]/voice/route.ts"),
      "utf8"
    );
    assert.match(route, /createGenerationJob/);
    assert.match(route, /VOICE_TTS/);
    assert.match(route, /billProviderAction/);
    assert.match(route, /frozenLanguage/);
    assert.doesNotMatch(route, /withStudioCreditGate/);
  });

  it("fusion render route uses GenerationJob semantics", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/editor/fusion/render/route.ts"),
      "utf8"
    );
    assert.match(route, /createGenerationJob/);
    assert.match(route, /FUSION_RENDER/);
    assert.match(route, /billProviderAction/);
  });

  it("motion jobs start/poll use async GenerationJob", () => {
    const start = readFileSync(
      join(process.cwd(), "src/app/api/animations/projects/[id]/jobs/start/route.ts"),
      "utf8"
    );
    const poll = readFileSync(
      join(process.cwd(), "src/app/api/animations/projects/[id]/jobs/poll/route.ts"),
      "utf8"
    );
    assert.match(start, /VIDEO_GENERATE/);
    assert.match(start, /beginAsyncGenerationJob/);
    assert.match(start, /createViduMotionAdapter/);
    assert.match(poll, /refreshAsyncGenerationJob/);
    assert.match(poll, /generationJob/);
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

  it("exposes history, cancel, recover routes", () => {
    const history = readFileSync(
      join(process.cwd(), "src/app/api/studio/generation-jobs/route.ts"),
      "utf8"
    );
    const cancel = readFileSync(
      join(process.cwd(), "src/app/api/studio/generation-jobs/[jobId]/cancel/route.ts"),
      "utf8"
    );
    const recover = readFileSync(
      join(process.cwd(), "src/app/api/studio/generation-jobs/[jobId]/recover/route.ts"),
      "utf8"
    );
    assert.match(history, /technicalRetryEligible/);
    assert.match(cancel, /CANCEL_UNSUPPORTED/);
    assert.match(recover, /technicalRetryGenerationJob/);
    assert.match(recover, /recharged: false/);
  });

  it("vidu adapter refuses fake cancellation", () => {
    const adapter = readFileSync(
      join(process.cwd(), "src/server/studio-generation/vidu-motion-adapter.ts"),
      "utf8"
    );
    assert.match(adapter, /supportsCancellation: false/);
  });
});
