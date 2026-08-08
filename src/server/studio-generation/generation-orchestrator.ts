/**
 * SERVER_ONLY — Canonical generation orchestrator (S.4).
 *
 * Product routes call the orchestrator. Adapters call providers.
 * Credit policy remains authorize → execute → capture/refund via existing wallet APIs.
 * Reservation decision: KEEP existing billProviderAction / withStudioCreditGate semantics
 * (no new reserve/refund model in S.4).
 */

import {
  getStudioGenerationCapability,
  STUDIO_GENERATION_CAPABILITIES,
  type StudioGenerationCapability,
  type StudioGenerationUiContract,
} from "@/lib/studio-generation-capabilities";
import {
  safeStudioGenerationErrorMessage,
  type StudioGenerationErrorCode,
} from "@/lib/studio-generation-errors";
import { isStudioGenerationTerminal } from "@/lib/studio-generation-status";
import { hashStudioGenerationInput } from "@/server/studio-generation/generation-job-hash";
import {
  createGenerationJobRow,
  finalizeGenerationChargeOnce,
  findGenerationJobByIdempotency,
  getGenerationJobForOwner,
  updateGenerationJobStatus,
  type StudioGenerationJobRow,
} from "@/server/studio-generation/generation-job-service";
import type { StudioGenerationProviderAdapter } from "@/server/studio-generation/provider-adapter";
import { usdToCredits } from "@/lib/studio-credit-constants";
import { STUDIO_ACTION_COST_REGISTRY } from "@/server/studio-account/studio-action-cost-registry";
import type { StudioActionType } from "@/server/studio-account/studio-action-cost-registry";
import type { Prisma } from "@prisma/client";

export type CreateGenerationJobInput = {
  ownerId: string;
  idempotencyKey: string;
  capability: StudioGenerationCapability;
  storyboardId?: string | null;
  sceneId?: string | null;
  /** Safe refs only — no secrets */
  inputSnapshot?: Record<string, unknown>;
  providerAdapter?: StudioGenerationProviderAdapter;
  creditCostOverride?: number;
};

export type CreateGenerationJobResult =
  | { kind: "created"; job: StudioGenerationJobRow }
  | { kind: "resumed"; job: StudioGenerationJobRow }
  | { kind: "replay"; job: StudioGenerationJobRow };

function resolveCreditCost(actionType: string, override?: number): number {
  if (override != null && override > 0) {
    return override;
  }
  if (actionType in STUDIO_ACTION_COST_REGISTRY) {
    return STUDIO_ACTION_COST_REGISTRY[actionType as StudioActionType].defaultCreditCost;
  }
  return usdToCredits(0.01);
}

export function toStudioGenerationUiContract(job: StudioGenerationJobRow): StudioGenerationUiContract {
  const capability = job.capability as StudioGenerationCapability;
  let supportsCancellation = false;
  if ((STUDIO_GENERATION_CAPABILITIES as readonly string[]).includes(capability)) {
    supportsCancellation = getStudioGenerationCapability(capability).supportsCancellation;
  }
  return {
    jobId: job.id,
    capability,
    status: job.status as StudioGenerationUiContract["status"],
    progress: null,
    safeMessage:
      job.errorMessageSafe ||
      (job.status === "succeeded" ? "Generation completed."
      : job.status === "failed" ? "Generation failed."
      : job.status === "cancelled" ? "Generation cancelled."
      : "Generation in progress."),
    creditCost: job.creditCost,
    creditsCharged: job.creditsCharged,
    chargeFinalized: job.chargeFinalized,
    storyboardId: job.storyboardId,
    sceneId: job.sceneId,
    outputAssetId: job.outputAssetId,
    supportsCancellation,
  };
}

/**
 * Create or resume a generation job.
 * Same ownerId + idempotencyKey → never creates a second paid job.
 */
export async function createGenerationJob(
  input: CreateGenerationJobInput
): Promise<CreateGenerationJobResult> {
  const existing = await findGenerationJobByIdempotency(input.ownerId, input.idempotencyKey);
  if (existing) {
    if (isStudioGenerationTerminal(existing.status)) {
      return { kind: "replay", job: existing };
    }
    return { kind: "resumed", job: existing };
  }

  const def = getStudioGenerationCapability(input.capability);
  if (def.targetScope === "scene" && !input.sceneId) {
    throw new Error("INVALID_INPUT: sceneId required for scene-scoped capability");
  }

  const inputHash = hashStudioGenerationInput({
    capability: input.capability,
    storyboardId: input.storyboardId ?? null,
    sceneId: input.sceneId ?? null,
    snapshot: input.inputSnapshot ?? {},
  });

  const adapterId = input.providerAdapter?.id ?? def.defaultAdapterId;
  const job = await createGenerationJobRow({
    ownerId: input.ownerId,
    storyboardId: input.storyboardId ?? null,
    sceneId: input.sceneId ?? null,
    capability: input.capability,
    actionType: def.actionType,
    executionMode: def.executionMode,
    providerAdapter: adapterId,
    idempotencyKey: input.idempotencyKey,
    inputHash,
    creditCost: resolveCreditCost(def.actionType, input.creditCostOverride),
    inputSnapshotJson: (input.inputSnapshot ?? {}) as Prisma.InputJsonValue,
  });

  return { kind: "created", job };
}

/**
 * Run a synchronous generation body under job lifecycle.
 * `executeBilled` must perform authorize/capture via existing credit APIs.
 * Orchestrator records chargeFinalized at most once.
 */
export async function runSynchronousGenerationJob<T>(input: {
  job: StudioGenerationJobRow;
  executeBilled: () => Promise<{
    ok: true;
    result: T;
    creditsCharged: number;
    creditReservationId?: string | null;
    outputAssetId?: string | null;
  } | {
    ok: false;
    errorCode: StudioGenerationErrorCode;
    safeMessage?: string;
    creditsCharged?: number;
  }>;
}): Promise<
  | { ok: true; job: StudioGenerationJobRow; result: T; replay?: boolean }
  | { ok: false; job: StudioGenerationJobRow; errorCode: StudioGenerationErrorCode }
> {
  if (input.job.status === "succeeded" && input.job.outputAssetId) {
    return {
      ok: true,
      job: input.job,
      result: undefined as T,
      replay: true,
    };
  }
  if (isStudioGenerationTerminal(input.job.status) && input.job.status !== "succeeded") {
    return {
      ok: false,
      job: input.job,
      errorCode: (input.job.errorCode as StudioGenerationErrorCode) || "INTERNAL_ERROR",
    };
  }

  let job = await updateGenerationJobStatus(input.job.id, {
    status: "generating",
    startedAt: input.job.startedAt ?? new Date(),
    attempt: input.job.attempt + 1,
  });

  const outcome = await input.executeBilled();

  if (!outcome.ok) {
    job = await updateGenerationJobStatus(job.id, {
      status: "failed",
      failedAt: new Date(),
      errorCode: outcome.errorCode,
      errorMessageSafe:
        outcome.safeMessage ?? safeStudioGenerationErrorMessage(outcome.errorCode),
    });
    return { ok: false, job, errorCode: outcome.errorCode };
  }

  if (outcome.creditsCharged > 0) {
    await finalizeGenerationChargeOnce({
      jobId: job.id,
      creditsCharged: outcome.creditsCharged,
      creditReservationId: outcome.creditReservationId,
    });
  } else if (outcome.creditReservationId) {
    await updateGenerationJobStatus(job.id, {
      status: "processing",
      creditReservationId: outcome.creditReservationId,
    });
  }

  job = await updateGenerationJobStatus(job.id, {
    status: "succeeded",
    completedAt: new Date(),
    outputAssetId: outcome.outputAssetId ?? null,
    creditsCharged: outcome.creditsCharged,
    chargeFinalized: outcome.creditsCharged > 0 ? true : undefined,
  });

  return { ok: true, job, result: outcome.result };
}

export async function failGenerationJob(
  jobId: string,
  errorCode: StudioGenerationErrorCode,
  safeMessage?: string
): Promise<StudioGenerationJobRow> {
  return updateGenerationJobStatus(jobId, {
    status: "failed",
    failedAt: new Date(),
    errorCode,
    errorMessageSafe: safeMessage ?? safeStudioGenerationErrorMessage(errorCode),
  });
}

export async function markGenerationStorageFailure(
  jobId: string
): Promise<StudioGenerationJobRow> {
  /** Provider succeeded; storage failed — do not clear chargeFinalized. */
  return updateGenerationJobStatus(jobId, {
    status: "failed",
    failedAt: new Date(),
    errorCode: "STORAGE_FAILED",
    errorMessageSafe: safeStudioGenerationErrorMessage("STORAGE_FAILED"),
  });
}

export async function getAuthorizedGenerationJob(
  jobId: string,
  ownerId: string
): Promise<StudioGenerationJobRow | null> {
  return getGenerationJobForOwner(jobId, ownerId);
}

/**
 * Technical retry: same paid attempt — resume/reprocess without a new charge.
 * Distinct from {@link retryGenerationJobAsNewAttempt} (new paid generation).
 */
export async function technicalRetryGenerationJob(input: {
  jobId: string;
  ownerId: string;
  reprocess: () => Promise<{
    ok: true;
    outputAssetId?: string | null;
    metadata?: Record<string, unknown>;
  } | {
    ok: false;
    errorCode: StudioGenerationErrorCode;
    safeMessage?: string;
  }>;
}): Promise<
  | { ok: true; job: StudioGenerationJobRow }
  | { ok: false; job: StudioGenerationJobRow; errorCode: StudioGenerationErrorCode }
> {
  const existing = await getGenerationJobForOwner(input.jobId, input.ownerId);
  if (!existing) {
    throw new Error("UNAUTHORIZED");
  }
  if (existing.status === "succeeded" && existing.outputAssetId) {
    return { ok: true, job: existing };
  }
  if (existing.errorCode !== "STORAGE_FAILED" && existing.status !== "failed") {
    return {
      ok: false,
      job: existing,
      errorCode: "INTERNAL_ERROR",
    };
  }

  let job = await updateGenerationJobStatus(existing.id, {
    status: "processing",
    attempt: existing.attempt + 1,
  });

  const outcome = await input.reprocess();
  if (!outcome.ok) {
    job = await updateGenerationJobStatus(job.id, {
      status: "failed",
      failedAt: new Date(),
      errorCode: outcome.errorCode,
      errorMessageSafe:
        outcome.safeMessage ?? safeStudioGenerationErrorMessage(outcome.errorCode),
    });
    return { ok: false, job, errorCode: outcome.errorCode };
  }

  job = await updateGenerationJobStatus(job.id, {
    status: "succeeded",
    completedAt: new Date(),
    failedAt: null,
    errorCode: "",
    errorMessageSafe: "",
    outputAssetId: outcome.outputAssetId ?? job.outputAssetId,
    metadataJson: (outcome.metadata ?? job.metadataJson ?? {}) as Prisma.InputJsonValue,
  });
  return { ok: true, job };
}

/**
 * Explicit new paid attempt — requires a new idempotency key (caller responsibility).
 * Same key must never create a second charge. Never reuse technical retry for this.
 */
export async function retryGenerationJobAsNewAttempt(input: CreateGenerationJobInput) {
  return createGenerationJob(input);
}

/**
 * Begin an async_poll generation: mark generating + store providerJobId.
 * Credit capture must already have happened (or be deferred) before calling when billable.
 */
export async function beginAsyncGenerationJob(input: {
  job: StudioGenerationJobRow;
  providerJobId: string;
  metadata?: Record<string, unknown>;
  creditsCharged?: number;
  creditReservationId?: string | null;
}): Promise<StudioGenerationJobRow> {
  if (input.creditsCharged && input.creditsCharged > 0) {
    await finalizeGenerationChargeOnce({
      jobId: input.job.id,
      creditsCharged: input.creditsCharged,
      creditReservationId: input.creditReservationId,
    });
  }
  return updateGenerationJobStatus(input.job.id, {
    status: "generating",
    startedAt: input.job.startedAt ?? new Date(),
    providerJobId: input.providerJobId,
    attempt: input.job.attempt + 1,
    metadataJson: (input.metadata ?? {}) as Prisma.InputJsonValue,
    creditsCharged: input.creditsCharged,
    chargeFinalized: input.creditsCharged && input.creditsCharged > 0 ? true : undefined,
  });
}

/**
 * Refresh async job from adapter.getStatus / getResult.
 * Safe across refresh/resume — never starts a second provider job.
 */
export async function refreshAsyncGenerationJob(input: {
  job: StudioGenerationJobRow;
  adapter: StudioGenerationProviderAdapter;
}): Promise<StudioGenerationJobRow> {
  if (isStudioGenerationTerminal(input.job.status)) {
    return input.job;
  }
  const providerJobId = input.job.providerJobId;
  if (!providerJobId || !input.adapter.getStatus) {
    return input.job;
  }

  const status = await input.adapter.getStatus(providerJobId);
  if (status.studioStatus === "succeeded") {
    const result = input.adapter.getResult ? await input.adapter.getResult(providerJobId) : {};
    return updateGenerationJobStatus(input.job.id, {
      status: "succeeded",
      completedAt: new Date(),
      outputAssetId: result.outputAssetId ?? input.job.outputAssetId,
      metadataJson: {
        ...(typeof input.job.metadataJson === "object" && input.job.metadataJson && !Array.isArray(input.job.metadataJson)
          ? (input.job.metadataJson as Record<string, unknown>)
          : {}),
        ...(result.metadata ?? {}),
      } as Prisma.InputJsonValue,
    });
  }
  if (status.studioStatus === "failed" || status.studioStatus === "cancelled") {
    return updateGenerationJobStatus(input.job.id, {
      status: status.studioStatus,
      failedAt: status.studioStatus === "failed" ? new Date() : undefined,
      cancelledAt: status.studioStatus === "cancelled" ? new Date() : undefined,
      errorCode: status.errorCode ?? (status.studioStatus === "failed" ? "PROVIDER_REJECTED" : ""),
      errorMessageSafe:
        status.errorMessageSafe ??
        safeStudioGenerationErrorMessage(
          (status.errorCode as StudioGenerationErrorCode) || "PROVIDER_REJECTED"
        ),
    });
  }
  return updateGenerationJobStatus(input.job.id, {
    status: status.studioStatus,
  });
}

/**
 * Honest cancellation: only when capability/adapter supports it.
 */
export async function requestGenerationJobCancellation(input: {
  jobId: string;
  ownerId: string;
  adapter?: StudioGenerationProviderAdapter;
}): Promise<
  | { ok: true; job: StudioGenerationJobRow }
  | { ok: false; reason: "not_found" | "unsupported" | "terminal"; job?: StudioGenerationJobRow }
> {
  const job = await getGenerationJobForOwner(input.jobId, input.ownerId);
  if (!job) {
    return { ok: false, reason: "not_found" };
  }
  if (isStudioGenerationTerminal(job.status)) {
    return { ok: false, reason: "terminal", job };
  }

  let supports = false;
  if ((STUDIO_GENERATION_CAPABILITIES as readonly string[]).includes(job.capability)) {
    supports = getStudioGenerationCapability(job.capability as StudioGenerationCapability)
      .supportsCancellation;
  }
  if (input.adapter) {
    supports = input.adapter.supportsCancellation;
  }
  if (!supports) {
    return { ok: false, reason: "unsupported", job };
  }

  let next = await updateGenerationJobStatus(job.id, {
    status: "cancel_requested",
  });
  if (input.adapter?.cancel && next.providerJobId) {
    await input.adapter.cancel(next.providerJobId);
  }
  next = await updateGenerationJobStatus(job.id, {
    status: "cancelled",
    cancelledAt: new Date(),
  });
  return { ok: true, job: next };
}
