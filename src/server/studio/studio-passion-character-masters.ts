/**
 * MADE WITH PASSION character masters.
 * Reserves the Studio wallet directly. Admin role does not skip the reservation.
 */

import {
  actualPassionProviderUsd,
  assessPassionMasterQuote,
  evaluatePassionMasterCall,
  GPT_IMAGE_1_PORTRAIT_HIGH_USD,
  passionCharacterPrompt,
  PASSION_CALL_USD_BOUND,
  PASSION_HC_PER_IMAGE,
  PASSION_PROJECT_TITLE,
  type PassionAttemptRecord,
  type PassionCharacterKey,
  type PassionMasterQuote,
} from "@/lib/studio-passion-stage-a";

export type PassionMasterResult = {
  characterKey: PassionCharacterKey;
  characterId: string;
  referenceImageUrl: string;
  storageKey: string;
  hcCharged: number;
  providerUsd: number;
  reused: boolean;
};

export type PassionClaimResult =
  | { state: "owned"; reservationId: string }
  | { state: "in_flight" }
  | { state: "captured" }
  | { state: "released" }
  | { state: "insufficient_credits" };

export type PassionClaimTx = {
  insertGeneratingClaim: (idempotencyKey: string) => Promise<void>;
  reserveStudioWallet: () => Promise<{ reservationId: string }>;
};

/** Database port. Production uses Prisma; tests use a unique-index simulator. */
export type PassionClaimDatabase = {
  transaction: <T>(fn: (tx: PassionClaimTx) => Promise<T>) => Promise<T>;
  readClaim: (idempotencyKey: string) => Promise<"generating" | "succeeded" | "failed" | null>;
};

export function isPassionUniqueConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export function passionClaimStateFromStatus(
  status: "generating" | "succeeded" | "failed" | null
): Exclude<PassionClaimResult, { state: "owned" } | { state: "insufficient_credits" }> {
  if (status === "succeeded") return { state: "captured" };
  if (status === "failed") return { state: "released" };
  return { state: "in_flight" };
}

/**
 * One billable owner per idempotency key.
 * The insert and the wallet reservation commit together.
 * A unique conflict never calls the provider.
 */
export async function claimPassionMasterReservation(
  db: PassionClaimDatabase,
  idempotencyKey: string
): Promise<PassionClaimResult> {
  try {
    return await db.transaction(async (tx) => {
      await tx.insertGeneratingClaim(idempotencyKey);
      const reserved = await tx.reserveStudioWallet();
      return { state: "owned" as const, reservationId: reserved.reservationId };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      return { state: "insufficient_credits" };
    }
    if (isPassionUniqueConflict(error)) {
      return passionClaimStateFromStatus(await db.readClaim(idempotencyKey));
    }
    throw error;
  }
}

export type PassionMasterDeps = {
  claim: (input: {
    userId: string;
    projectId: string;
    credits: number;
    providerUsdBound: number;
    idempotencyKey: string;
    characterKey: PassionCharacterKey;
    attempt: 1 | 2;
    quote: PassionMasterQuote;
  }) => Promise<PassionClaimResult>;
  settle: (input: {
    userId: string;
    idempotencyKey: string;
    outcome: "captured" | "released";
  }) => Promise<void>;
  generate: (input: {
    prompt: string;
    idempotencyKey: string;
    ownerId: string;
  }) => Promise<{
    imageBuffer: Buffer;
    thumbnailBuffer: Buffer;
    contentType: string;
    usage: { inputTokens?: number; outputTokens?: number } | null;
  }>;
  persist: (input: {
    userId: string;
    projectId: string;
    characterKey: PassionCharacterKey;
    name: string;
    prompt: string;
    imageBuffer: Buffer;
    thumbnailBuffer: Buffer;
    contentType: string;
    idempotencyKey: string;
    hc: number;
    providerUsd: number;
    attempt: 1 | 2;
  }) => Promise<{ characterId: string; referenceImageUrl: string; storageKey: string }>;
  capture: (input: {
    userId: string;
    projectId: string;
    reservationId: string;
    credits: number;
    providerUsd: number;
    idempotencyKey: string;
    characterId: string;
    referenceImageUrl: string;
  }) => Promise<void>;
  refund: (input: {
    userId: string;
    projectId: string;
    reservationId: string;
    credits: number;
    idempotencyKey: string;
    providerUsd: number;
    failed: boolean;
  }) => Promise<void>;
  findReuse: (input: {
    userId: string;
    idempotencyKey: string;
  }) => Promise<PassionMasterResult | null>;
};

export async function executePassionMasterGeneration(input: {
  userId: string;
  project: { id: string; ownerId: string; title: string } | null;
  presentedQuote: PassionMasterQuote | null;
  characterKey: string;
  attempt: number;
  confirmed: boolean;
  retryConfirmed: boolean;
  nowMs: number;
  secret: string;
  attempts: PassionAttemptRecord[];
  deps: PassionMasterDeps;
}): Promise<{ ok: true; result: PassionMasterResult } | { ok: false; code: string }> {
  if (!input.project || input.project.ownerId !== input.userId || input.project.title !== PASSION_PROJECT_TITLE) {
    return { ok: false, code: "PROJECT_FORBIDDEN" };
  }
  const quoteDecision = assessPassionMasterQuote({
    secret: input.secret,
    nowMs: input.nowMs,
    presented: input.presentedQuote,
    userId: input.userId,
    projectId: input.project.id,
  });
  if (!quoteDecision.ok || !input.presentedQuote) {
    return { ok: false, code: quoteDecision.ok ? "QUOTE_REQUIRED" : quoteDecision.code };
  }
  const decision = evaluatePassionMasterCall({
    quoteOk: true,
    quoteId: input.presentedQuote.id,
    confirmed: input.confirmed,
    retryConfirmed: input.retryConfirmed,
    characterKey: input.characterKey,
    attempt: input.attempt,
    attempts: input.attempts,
  });
  if (!decision.ok) {
    return decision;
  }
  const characterKey = input.characterKey as PassionCharacterKey;
  if (decision.action === "reuse") {
    const existing = await input.deps.findReuse({
      userId: input.userId,
      idempotencyKey: decision.idempotencyKey,
    });
    if (!existing) {
      return { ok: false, code: "REUSE_MISSING" };
    }
    return { ok: true, result: { ...existing, reused: true } };
  }

  const brief = passionCharacterPrompt(characterKey);
  let claimed: PassionClaimResult;
  try {
    claimed = await input.deps.claim({
      userId: input.userId,
      projectId: input.project.id,
      credits: PASSION_HC_PER_IMAGE,
      providerUsdBound: PASSION_CALL_USD_BOUND,
      idempotencyKey: decision.idempotencyKey,
      characterKey,
      attempt: input.attempt as 1 | 2,
      quote: input.presentedQuote,
    });
  } catch {
    return { ok: false, code: "RESERVATION_FAILED" };
  }
  if (claimed.state === "insufficient_credits") {
    return { ok: false, code: "INSUFFICIENT_CREDITS" };
  }
  if (claimed.state === "in_flight") {
    return { ok: false, code: "IN_FLIGHT" };
  }
  if (claimed.state === "released") {
    return { ok: false, code: "ATTEMPT_USED" };
  }
  if (claimed.state === "captured") {
    const existing = await input.deps.findReuse({
      userId: input.userId,
      idempotencyKey: decision.idempotencyKey,
    });
    if (!existing) {
      return { ok: false, code: "REUSE_MISSING" };
    }
    return { ok: true, result: { ...existing, reused: true } };
  }
  const reserved = { reservationId: claimed.reservationId };

  let generated: Awaited<ReturnType<PassionMasterDeps["generate"]>> | null = null;
  try {
    generated = await input.deps.generate({
      prompt: brief.prompt,
      idempotencyKey: decision.idempotencyKey,
      ownerId: input.userId,
    });
    const actual = actualPassionProviderUsd(generated.usage);
    const providerUsd =
      actual == null ? PASSION_CALL_USD_BOUND : Math.max(actual, GPT_IMAGE_1_PORTRAIT_HIGH_USD);
    const saved = await input.deps.persist({
      userId: input.userId,
      projectId: input.project.id,
      characterKey,
      name: brief.name,
      prompt: brief.prompt,
      imageBuffer: generated.imageBuffer,
      thumbnailBuffer: generated.thumbnailBuffer,
      contentType: generated.contentType,
      idempotencyKey: decision.idempotencyKey,
      hc: PASSION_HC_PER_IMAGE,
      providerUsd,
      attempt: input.attempt as 1 | 2,
    });
    await input.deps.capture({
      userId: input.userId,
      projectId: input.project.id,
      reservationId: reserved.reservationId,
      credits: PASSION_HC_PER_IMAGE,
      providerUsd,
      idempotencyKey: decision.idempotencyKey,
      characterId: saved.characterId,
      referenceImageUrl: saved.referenceImageUrl,
    });
    await input.deps
      .settle({
        userId: input.userId,
        idempotencyKey: decision.idempotencyKey,
        outcome: "captured",
      })
      .catch(() => undefined);
    return {
      ok: true,
      result: {
        characterKey,
        characterId: saved.characterId,
        referenceImageUrl: saved.referenceImageUrl,
        storageKey: saved.storageKey,
        hcCharged: PASSION_HC_PER_IMAGE,
        providerUsd,
        reused: false,
      },
    };
  } catch {
    const providerUsd = generated ? (actualPassionProviderUsd(generated.usage) ?? PASSION_CALL_USD_BOUND) : 0;
    await input.deps.refund({
      userId: input.userId,
      projectId: input.project.id,
      reservationId: reserved.reservationId,
      credits: PASSION_HC_PER_IMAGE,
      idempotencyKey: decision.idempotencyKey,
      providerUsd,
      failed: true,
    });
    await input.deps
      .settle({
        userId: input.userId,
        idempotencyKey: decision.idempotencyKey,
        outcome: "released",
      })
      .catch(() => undefined);
    return { ok: false, code: "GENERATION_FAILED" };
  }
}
