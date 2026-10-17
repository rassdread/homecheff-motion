/**
 * Stage A preflight for the MADE WITH PASSION commercial.
 * Pure decisions only: no database, no provider calls.
 *
 * gpt-image-1 image-card prices are the published per-image figures from
 * https://developers.openai.com/api/docs/models/gpt-image-1
 * They are not OPENAI_DALLE3_IMAGE_USD.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { usdToCredits } from "@/lib/studio-credit-constants";

export const PASSION_STAGE_A_AUDIT = "HOMECHEFF_STUDIO_MADE_WITH_PASSION_STAGE_A_V2";
export const PASSION_TEST_GRANT_REASON = "MADE_WITH_PASSION_PREVIEW_PRODUCTION_TEST_CREDITS";
export const PASSION_TEST_GRANT_CLASSIFICATION = "DEVELOPMENT_TEST";
export const PASSION_TARGET_BALANCE_HC = 10_000;
export const PASSION_EXPECTED_BALANCE_BEFORE_GRANT_HC = 500;
export const PASSION_PROPOSED_PROVIDER_BUDGET_USD = 5;

export const GPT_IMAGE_1_MODEL = "gpt-image-1";
export const GPT_IMAGE_1_PORTRAIT_SIZE = "1024x1536";
export const GPT_IMAGE_1_HIGH_QUALITY = "high";

/** Published image-card price for gpt-image-1, high, 1024x1536. */
export const GPT_IMAGE_1_PORTRAIT_HIGH_USD = 0.25;

/** Published text input price. Image output tokens are already reflected in the image card. */
export const GPT_IMAGE_1_TEXT_INPUT_USD_PER_TOKEN = 5 / 1_000_000;

/** The generations helper slices prompts to this many characters. */
export const GPT_IMAGE_1_PROMPT_CHAR_CAP = 4000;

export type PreviewTopUpDecision =
  | { action: "grant"; credits: number; write: true }
  | { action: "skip"; credits: 0; write: false; reason: "already_recorded" }
  | { action: "hold"; credits: number; write: false; reason: "balance_differs" };

export function planPreviewTestTopUp(input: {
  currentBalance: number;
  grantAlreadyRecorded: boolean;
  targetBalance?: number;
  expectedBalance?: number;
}): PreviewTopUpDecision {
  if (input.grantAlreadyRecorded) {
    return { action: "skip", credits: 0, write: false, reason: "already_recorded" };
  }
  const target = input.targetBalance ?? PASSION_TARGET_BALANCE_HC;
  const expected = input.expectedBalance ?? PASSION_EXPECTED_BALANCE_BEFORE_GRANT_HC;
  const credits = target - input.currentBalance;
  if (input.currentBalance !== expected) {
    return { action: "hold", credits, write: false, reason: "balance_differs" };
  }
  return { action: "grant", credits, write: true };
}

export type PassionImageProposal = {
  model: typeof GPT_IMAGE_1_MODEL;
  size: typeof GPT_IMAGE_1_PORTRAIT_SIZE;
  quality: typeof GPT_IMAGE_1_HIGH_QUALITY;
  masterCount: 3;
  retriesPerCharacter: 1;
  imageUsdEach: typeof GPT_IMAGE_1_PORTRAIT_HIGH_USD;
  threeMasterImageUsd: number;
  retryImageUsd: number;
  maximumImageUsd: number;
  textInputAllowanceUsd: number;
  maximumWithTextAllowanceUsd: number;
  ceilingUsd: number;
  withinCeiling: boolean;
};

export function proposePassionStageAImages(input?: {
  ceilingUsd?: number;
  inputTokensPerCall?: number;
}): PassionImageProposal {
  const ceilingUsd = input?.ceilingUsd ?? PASSION_PROPOSED_PROVIDER_BUDGET_USD;
  const inputTokensPerCall = input?.inputTokensPerCall ?? GPT_IMAGE_1_PROMPT_CHAR_CAP;
  const masters = 3;
  const retries = masters;
  const calls = masters + retries;
  const threeMasterImageUsd = roundUsd(masters * GPT_IMAGE_1_PORTRAIT_HIGH_USD);
  const retryImageUsd = roundUsd(retries * GPT_IMAGE_1_PORTRAIT_HIGH_USD);
  const maximumImageUsd = roundUsd(calls * GPT_IMAGE_1_PORTRAIT_HIGH_USD);
  const textInputAllowanceUsd = roundUsd(
    calls * inputTokensPerCall * GPT_IMAGE_1_TEXT_INPUT_USD_PER_TOKEN
  );
  const maximumWithTextAllowanceUsd = roundUsd(maximumImageUsd + textInputAllowanceUsd);
  return {
    model: GPT_IMAGE_1_MODEL,
    size: GPT_IMAGE_1_PORTRAIT_SIZE,
    quality: GPT_IMAGE_1_HIGH_QUALITY,
    masterCount: masters,
    retriesPerCharacter: 1,
    imageUsdEach: GPT_IMAGE_1_PORTRAIT_HIGH_USD,
    threeMasterImageUsd,
    retryImageUsd,
    maximumImageUsd,
    textInputAllowanceUsd,
    maximumWithTextAllowanceUsd,
    ceilingUsd,
    withinCeiling: maximumWithTextAllowanceUsd <= ceilingUsd,
  };
}

export function assessPassionProviderCall(input: {
  model: string;
  size: string;
  quality: string;
  spentUsd: number;
  ceilingUsd?: number;
}): { allowed: boolean; reason: string } {
  const proposal = proposePassionStageAImages({ ceilingUsd: input.ceilingUsd });
  if (input.model !== proposal.model) {
    return { allowed: false, reason: "MODEL_NOT_LOCKED" };
  }
  if (input.size !== proposal.size) {
    return { allowed: false, reason: "SIZE_NOT_PORTRAIT" };
  }
  if (input.quality !== proposal.quality) {
    return { allowed: false, reason: "QUALITY_NOT_LOCKED" };
  }
  const next = roundUsd(input.spentUsd + proposal.imageUsdEach);
  if (next > proposal.ceilingUsd) {
    return { allowed: false, reason: "PROVIDER_BUDGET_EXCEEDED" };
  }
  return { allowed: true, reason: "WITHIN_LOCKED_CONFIG" };
}

function roundUsd(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export const PASSION_MASTERS_AUDIT = "HOMECHEFF_STUDIO_CHARACTER_MASTERS_STAGE_A_V3";
export const PASSION_PROMPT_VERSION = "passion-masters-v3";
export const PASSION_PROJECT_TITLE = "MADE WITH PASSION";
export const PASSION_QUOTE_TTL_MS = 30 * 60 * 1000;
export const PASSION_MAX_IMAGES = 6;
export const PASSION_MAX_HC = 750;
export const PASSION_HC_PER_IMAGE = usdToCredits(GPT_IMAGE_1_PORTRAIT_HIGH_USD);
export const PASSION_INITIAL_IMAGES = 3;

/** Published text-input ceiling for a prompt sliced to 4,000 characters. */
export const PASSION_TEXT_USD_BOUND = roundUsd(
  GPT_IMAGE_1_PROMPT_CHAR_CAP * GPT_IMAGE_1_TEXT_INPUT_USD_PER_TOKEN
);

/**
 * Pre-submission bound: published high-portrait image card plus the text ceiling.
 * Output tokens are not added again on top of the card. If size or quality is
 * missing, the call is unbounded and must not be submitted.
 */
export const PASSION_CALL_USD_BOUND = roundUsd(
  GPT_IMAGE_1_PORTRAIT_HIGH_USD + PASSION_TEXT_USD_BOUND
);

export const PASSION_CHARACTER_KEYS = ["baker", "potter", "gardener"] as const;
export type PassionCharacterKey = (typeof PASSION_CHARACTER_KEYS)[number];

export type PassionMasterQuote = {
  id: string;
  userId: string;
  projectId: string;
  model: typeof GPT_IMAGE_1_MODEL;
  size: typeof GPT_IMAGE_1_PORTRAIT_SIZE;
  quality: typeof GPT_IMAGE_1_HIGH_QUALITY;
  promptVersion: typeof PASSION_PROMPT_VERSION;
  hcPerImage: number;
  initialImages: number;
  initialHc: number;
  maxImages: number;
  maxHc: number;
  callUsdBound: number;
  maxProviderUsd: number;
  issuedAt: string;
  expiresAt: string;
  signature: string;
};

export type PassionMasterQuoteDraft = Omit<PassionMasterQuote, "signature">;

const CHARACTER_PROMPTS: Record<PassionCharacterKey, { name: string; prompt: string }> = {
  baker: {
    name: "Baker",
    prompt:
      "Photorealistic cinematic vertical portrait of an original fictional woman aged 28 to 35. Brown wavy hair tied in a ponytail. Natural friendly expression. Linen apron. Warm professional kitchen. Soft window light. Unobstructed face. Natural hands and anatomy. No text, no logo, no watermark.",
  },
  potter: {
    name: "Potter",
    prompt:
      "Photorealistic cinematic vertical portrait of an original fictional man aged 30 to 38. Blond wavy hair. Argentine-inspired appearance. Calm expression. Pottery workshop with a pottery wheel and shelves. Clay-stained hands. Unobstructed face. Natural anatomy. No text, no logo, no watermark.",
  },
  gardener: {
    name: "Gardener",
    prompt:
      "Photorealistic cinematic vertical portrait of an original fictional woman aged 28 to 35. Mixed-heritage appearance, warm skin, long voluminous blonde curls. Natural lively expression. Beautiful flower garden. Unobstructed face. Natural hands and anatomy. No text, no logo, no watermark.",
  },
};

export function passionCharacterPrompt(key: PassionCharacterKey): { name: string; prompt: string } {
  return CHARACTER_PROMPTS[key];
}

export function isPassionCharacterKey(value: string): value is PassionCharacterKey {
  return (PASSION_CHARACTER_KEYS as readonly string[]).includes(value);
}

export function passionQuoteId(input: {
  userId: string;
  projectId: string;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        audit: PASSION_MASTERS_AUDIT,
        userId: input.userId,
        projectId: input.projectId,
        model: GPT_IMAGE_1_MODEL,
        size: GPT_IMAGE_1_PORTRAIT_SIZE,
        quality: GPT_IMAGE_1_HIGH_QUALITY,
        promptVersion: PASSION_PROMPT_VERSION,
        hcPerImage: PASSION_HC_PER_IMAGE,
        maxImages: PASSION_MAX_IMAGES,
        maxHc: PASSION_MAX_HC,
        callUsdBound: PASSION_CALL_USD_BOUND,
        maxProviderUsd: PASSION_PROPOSED_PROVIDER_BUDGET_USD,
      })
    )
    .digest("hex");
}

function canonicalPassionQuote(quote: PassionMasterQuoteDraft): string {
  return [
    quote.id,
    quote.userId,
    quote.projectId,
    quote.model,
    quote.size,
    quote.quality,
    quote.promptVersion,
    quote.hcPerImage,
    quote.initialImages,
    quote.initialHc,
    quote.maxImages,
    quote.maxHc,
    quote.callUsdBound,
    quote.maxProviderUsd,
    quote.issuedAt,
    quote.expiresAt,
  ].join("|");
}

export function signPassionMasterQuote(quote: PassionMasterQuoteDraft, secret: string): string {
  return createHmac("sha256", secret).update(canonicalPassionQuote(quote)).digest("hex");
}

export function issuePassionMasterQuote(input: {
  userId: string;
  projectId: string;
  nowMs: number;
  secret: string;
}): PassionMasterQuote {
  const issuedAt = new Date(input.nowMs).toISOString();
  const draft: PassionMasterQuoteDraft = {
    id: passionQuoteId({ userId: input.userId, projectId: input.projectId }),
    userId: input.userId,
    projectId: input.projectId,
    model: GPT_IMAGE_1_MODEL,
    size: GPT_IMAGE_1_PORTRAIT_SIZE,
    quality: GPT_IMAGE_1_HIGH_QUALITY,
    promptVersion: PASSION_PROMPT_VERSION,
    hcPerImage: PASSION_HC_PER_IMAGE,
    initialImages: PASSION_INITIAL_IMAGES,
    initialHc: PASSION_INITIAL_IMAGES * PASSION_HC_PER_IMAGE,
    maxImages: PASSION_MAX_IMAGES,
    maxHc: PASSION_MAX_HC,
    callUsdBound: PASSION_CALL_USD_BOUND,
    maxProviderUsd: PASSION_PROPOSED_PROVIDER_BUDGET_USD,
    issuedAt,
    expiresAt: new Date(input.nowMs + PASSION_QUOTE_TTL_MS).toISOString(),
  };
  return { ...draft, signature: signPassionMasterQuote(draft, input.secret) };
}

function passionSignaturesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type PassionQuoteDecision =
  | { ok: true }
  | {
      ok: false;
      code: "QUOTE_REQUIRED" | "QUOTE_INVALID" | "QUOTE_EXPIRED" | "QUOTE_CHANGED" | "COST_UNBOUNDED";
    };

export function assessPassionMasterQuote(input: {
  secret: string;
  nowMs: number;
  presented: PassionMasterQuote | null;
  userId: string;
  projectId: string;
}): PassionQuoteDecision {
  const presented = input.presented;
  if (!presented?.id || !presented.signature) {
    return { ok: false, code: "QUOTE_REQUIRED" };
  }
  if (
    PASSION_HC_PER_IMAGE * PASSION_MAX_IMAGES > PASSION_MAX_HC ||
    roundUsd(PASSION_CALL_USD_BOUND * PASSION_MAX_IMAGES) > PASSION_PROPOSED_PROVIDER_BUDGET_USD
  ) {
    return { ok: false, code: "COST_UNBOUNDED" };
  }
  const expected = signPassionMasterQuote(
    {
      id: presented.id,
      userId: presented.userId,
      projectId: presented.projectId,
      model: presented.model,
      size: presented.size,
      quality: presented.quality,
      promptVersion: presented.promptVersion,
      hcPerImage: presented.hcPerImage,
      initialImages: presented.initialImages,
      initialHc: presented.initialHc,
      maxImages: presented.maxImages,
      maxHc: presented.maxHc,
      callUsdBound: presented.callUsdBound,
      maxProviderUsd: presented.maxProviderUsd,
      issuedAt: presented.issuedAt,
      expiresAt: presented.expiresAt,
    },
    input.secret
  );
  if (!passionSignaturesMatch(presented.signature, expected)) {
    return { ok: false, code: "QUOTE_INVALID" };
  }
  const current = issuePassionMasterQuote({
    userId: input.userId,
    projectId: input.projectId,
    nowMs: input.nowMs,
    secret: input.secret,
  });
  if (
    presented.userId !== input.userId ||
    presented.projectId !== input.projectId ||
    presented.id !== current.id ||
    presented.model !== current.model ||
    presented.size !== current.size ||
    presented.quality !== current.quality ||
    presented.promptVersion !== current.promptVersion ||
    presented.hcPerImage !== current.hcPerImage ||
    presented.initialHc !== current.initialHc ||
    presented.maxImages !== current.maxImages ||
    presented.maxHc !== current.maxHc ||
    presented.callUsdBound !== current.callUsdBound ||
    presented.maxProviderUsd !== current.maxProviderUsd
  ) {
    return { ok: false, code: "QUOTE_CHANGED" };
  }
  if (Date.parse(presented.expiresAt) <= input.nowMs) {
    return { ok: false, code: "QUOTE_EXPIRED" };
  }
  return { ok: true };
}

export type PassionAttemptStatus = "open" | "captured" | "released";

export type PassionAttemptRecord = {
  characterKey: PassionCharacterKey;
  attempt: 1 | 2;
  status: PassionAttemptStatus;
  providerUsd: number;
};

export function passionIdempotencyKey(quoteId: string, characterKey: PassionCharacterKey, attempt: 1 | 2): string {
  return `${quoteId}:${characterKey}:${attempt}`;
}

export type PassionCallDecision =
  | { ok: true; action: "generate" | "reuse"; idempotencyKey: string; hc: number; providerUsdBound: number }
  | { ok: false; code: string };

export function evaluatePassionMasterCall(input: {
  quoteOk: boolean;
  quoteId: string;
  confirmed: boolean;
  retryConfirmed: boolean;
  characterKey: string;
  attempt: number;
  attempts: PassionAttemptRecord[];
}): PassionCallDecision {
  if (!input.quoteOk || !input.quoteId) {
    return { ok: false, code: "QUOTE_REQUIRED" };
  }
  if (!isPassionCharacterKey(input.characterKey)) {
    return { ok: false, code: "CHARACTER_INVALID" };
  }
  if (input.attempt !== 1 && input.attempt !== 2) {
    return { ok: false, code: "ATTEMPT_INVALID" };
  }
  const characterKey = input.characterKey;
  const attempt = input.attempt;
  const idempotencyKey = passionIdempotencyKey(input.quoteId, characterKey, attempt);
  const same = input.attempts.find((row) => row.characterKey === characterKey && row.attempt === attempt);
  if (same?.status === "captured") {
    return {
      ok: true,
      action: "reuse",
      idempotencyKey,
      hc: PASSION_HC_PER_IMAGE,
      providerUsdBound: PASSION_CALL_USD_BOUND,
    };
  }
  if (same?.status === "open") {
    return { ok: false, code: "IN_FLIGHT" };
  }
  if (same?.status === "released") {
    return { ok: false, code: "ATTEMPT_USED" };
  }
  if (!input.confirmed) {
    return { ok: false, code: "CONFIRMATION_REQUIRED" };
  }
  if (attempt === 2) {
    if (!input.retryConfirmed) {
      return { ok: false, code: "RETRY_NOT_CONFIRMED" };
    }
    const first = input.attempts.find((row) => row.characterKey === characterKey && row.attempt === 1);
    if (!first || first.status === "open") {
      return { ok: false, code: "RETRY_WITHOUT_INITIAL" };
    }
    const retries = input.attempts.filter((row) => row.characterKey === characterKey && row.attempt === 2);
    if (retries.length > 0) {
      return { ok: false, code: "RETRY_LIMIT" };
    }
  }
  const usedImages = input.attempts.length;
  if (usedImages + 1 > PASSION_MAX_IMAGES) {
    return { ok: false, code: "IMAGE_LIMIT" };
  }
  const heldHc = input.attempts
    .filter((row) => row.status === "open" || row.status === "captured")
    .reduce((sum) => sum + PASSION_HC_PER_IMAGE, 0);
  if (heldHc + PASSION_HC_PER_IMAGE > PASSION_MAX_HC) {
    return { ok: false, code: "HC_LIMIT" };
  }
  const spentUsd = input.attempts.reduce((sum, row) => {
    if (row.status === "released" && row.providerUsd <= 0) return sum;
    return sum + row.providerUsd;
  }, 0);
  const budget = assessPassionProviderCall({
    model: GPT_IMAGE_1_MODEL,
    size: GPT_IMAGE_1_PORTRAIT_SIZE,
    quality: GPT_IMAGE_1_HIGH_QUALITY,
    spentUsd,
    ceilingUsd: PASSION_PROPOSED_PROVIDER_BUDGET_USD,
  });
  if (!budget.allowed) {
    return { ok: false, code: budget.reason };
  }
  if (roundUsd(spentUsd + PASSION_CALL_USD_BOUND) > PASSION_PROPOSED_PROVIDER_BUDGET_USD) {
    return { ok: false, code: "PROVIDER_BUDGET_EXCEEDED" };
  }
  return {
    ok: true,
    action: "generate",
    idempotencyKey,
    hc: PASSION_HC_PER_IMAGE,
    providerUsdBound: PASSION_CALL_USD_BOUND,
  };
}

export function actualPassionProviderUsd(usage: { inputTokens?: number; outputTokens?: number } | null): number | null {
  if (!usage) return null;
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  if (inputTokens < 0 || outputTokens < 0) return null;
  if (inputTokens === 0 && outputTokens === 0) return null;
  const text = inputTokens * GPT_IMAGE_1_TEXT_INPUT_USD_PER_TOKEN;
  const image = outputTokens * (40 / 1_000_000);
  return roundUsd(text + image);
}
