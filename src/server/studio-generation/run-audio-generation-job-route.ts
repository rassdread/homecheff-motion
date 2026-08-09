/**
 * S.7B — Shared GenerationJob wrapper for audio capabilities.
 * Preserves existing billProviderAction credit semantics (prices unchanged).
 */

import { NextResponse } from "next/server";
import { STUDIO_AUDIO_CACHE_POLICY } from "@/lib/studio-audio-ownership";
import { resolveStudioGenerationIdempotencyKey } from "@/lib/studio-generation-idempotency";
import type { StudioGenerationCapability } from "@/lib/studio-generation-capabilities";
import type { SessionUser } from "@/server/auth/session";
import { billProviderAction } from "@/server/studio-account/bill-provider-action";
import type { StudioActionType } from "@/server/studio-account/studio-action-cost-registry";
import {
  createGenerationJob,
  runSynchronousGenerationJob,
  toStudioGenerationUiContract,
} from "@/server/studio-generation/generation-orchestrator";
import type { StudioGenerationJobRow } from "@/server/studio-generation/generation-job-service";

export type AudioJobSuccessPayload = {
  body: Record<string, unknown>;
  cacheHit: boolean;
  estimatedCredits?: number;
};

/**
 * Idempotent audio generation: create/resume GenerationJob → bill → capture once.
 * CACHE_HIT → skipCapture → no new user charge (policy explicit).
 */
export async function runAudioGenerationJobRoute<TResult>(input: {
  user: Pick<SessionUser, "id" | "email" | "role">;
  capability: Extract<
    StudioGenerationCapability,
    "VOICE_CLONE" | "MUSIC_GENERATE" | "SFX_GENERATE"
  >;
  actionType: Extract<
    StudioActionType,
    "voice_clone" | "music_generation" | "sfx_generation"
  >;
  idempotencyKey: string;
  storyboardId?: string | null;
  sceneId?: string | null;
  projectId?: string;
  confirmed?: boolean;
  relatedJobId?: string;
  inputSnapshot: Record<string, unknown>;
  execute: () => Promise<TResult>;
  isFailure: (result: TResult) => boolean;
  skipCapture?: (result: TResult) => boolean;
  getOutputAssetId: (result: TResult) => string | null;
  mapSuccess: (result: TResult, estimatedCredits?: number) => Record<string, unknown>;
  mapFailure: (result: TResult) => { error: string; code: string; status?: number };
  /** Optional: enrich idempotent replay responses (e.g. reload library asset). */
  mapReplay?: (job: StudioGenerationJobRow) => Promise<Record<string, unknown> | null>;
}): Promise<NextResponse> {
  const created = await createGenerationJob({
    ownerId: input.user.id,
    idempotencyKey: input.idempotencyKey,
    capability: input.capability,
    storyboardId: input.storyboardId ?? null,
    sceneId: input.sceneId ?? null,
    inputSnapshot: input.inputSnapshot,
  });

  if (created.kind === "replay" && created.job.status === "succeeded" && created.job.outputAssetId) {
    const extra = input.mapReplay ? await input.mapReplay(created.job) : null;
    return NextResponse.json(
      {
        ok: true,
        replay: true,
        cachePolicy: STUDIO_AUDIO_CACHE_POLICY.cacheHit,
        generationJob: toStudioGenerationUiContract(created.job),
        outputAssetId: created.job.outputAssetId,
        ...(extra ?? {}),
      },
      { status: 200 }
    );
  }

  if (created.kind === "resumed" && created.job.status === "generating") {
    return NextResponse.json(
      {
        error: "A generation with this request is already in progress.",
        code: "CONFLICT",
        generationJob: toStudioGenerationUiContract(created.job),
      },
      { status: 409 }
    );
  }

  const run = await runSynchronousGenerationJob({
    job: created.job,
    executeBilled: async () => {
      const billed = await billProviderAction({
        user: input.user,
        actionType: input.actionType,
        projectId: input.projectId,
        confirmed: input.confirmed,
        relatedJobId: input.relatedJobId ?? created.job.id,
        execute: input.execute,
        isFailure: input.isFailure,
        skipCapture: input.skipCapture,
      });

      if ("blocked" in billed) {
        const payload = await billed.blocked.clone().json().catch(() => ({}));
        const code =
          typeof payload === "object" && payload && "code" in payload
            ? String((payload as { code?: string }).code)
            : "";
        return {
          ok: false as const,
          errorCode:
            code === "free_account_provider_action" ||
            code === "insufficient_credits" ||
            code === "insufficient_balance"
              ? ("INSUFFICIENT_CREDITS" as const)
              : ("PROVIDER_REJECTED" as const),
          safeMessage:
            typeof payload === "object" && payload && "error" in payload
              ? String((payload as { error?: string }).error)
              : undefined,
        };
      }

      const result = billed.result;
      if (input.isFailure(result)) {
        const mapped = input.mapFailure(result);
        return {
          ok: false as const,
          errorCode: "PROVIDER_REJECTED" as const,
          safeMessage: mapped.error,
        };
      }

      const cacheHit = Boolean(input.skipCapture?.(result));
      const payload: AudioJobSuccessPayload = {
        body: input.mapSuccess(result, billed.billing.estimatedCredits),
        cacheHit,
        estimatedCredits: billed.billing.estimatedCredits,
      };

      return {
        ok: true as const,
        result: payload,
        creditsCharged: billed.billing.captured
          ? (billed.billing.estimatedCredits ?? 0)
          : 0,
        outputAssetId: input.getOutputAssetId(result),
      };
    },
  });

  if (!run.ok) {
    return NextResponse.json(
      {
        error: run.job.errorMessageSafe || "Audio generation failed.",
        code: run.errorCode,
        generationJob: toStudioGenerationUiContract(run.job),
        creditGate: run.errorCode === "INSUFFICIENT_CREDITS",
      },
      { status: run.errorCode === "INSUFFICIENT_CREDITS" ? 403 : 500 }
    );
  }

  if (run.replay) {
    const extra = input.mapReplay ? await input.mapReplay(run.job) : null;
    return NextResponse.json(
      {
        ok: true,
        replay: true,
        generationJob: toStudioGenerationUiContract(run.job),
        outputAssetId: run.job.outputAssetId,
        ...(extra ?? {}),
      },
      { status: 200 }
    );
  }

  const payload = run.result as AudioJobSuccessPayload;
  return NextResponse.json(
    {
      ok: true,
      ...payload.body,
      cacheHit: payload.cacheHit || undefined,
      cachePolicy: payload.cacheHit ? STUDIO_AUDIO_CACHE_POLICY.cacheHit : undefined,
      generationJob: toStudioGenerationUiContract(run.job),
    },
    { status: 200 }
  );
}

export function resolveAudioRouteIdempotencyKey(input: {
  request: Request;
  clientMutationId?: string | null;
  fallbackPrefix: string;
}): string {
  return resolveStudioGenerationIdempotencyKey({
    headerKey: input.request.headers.get("idempotency-key"),
    clientMutationId: input.clientMutationId,
    fallbackPrefix: input.fallbackPrefix,
  });
}
