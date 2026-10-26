/**
 * Signed production quote.
 * The id is the storyboard and price fingerprint. A client total is not an input.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const PRODUCTION_QUOTE_TTL_MS = 30 * 60 * 1000;

export type ProductionQuoteMethod = "reference" | "start_end" | "multiframe";

export type ProductionQuoteScene = {
  sceneId: string;
  order: number;
  durationSeconds: number;
  method: ProductionQuoteMethod;
  characterIds: string[];
};

export type ProductionQuoteOptions = {
  intent: string;
  photoCount: number;
  logoCount: number;
  productCount: number;
  characterId: string;
  hasUploadedAudio: boolean;
  targetDurationSeconds: number;
  musicTrackId?: string;
  sceneOverlayKey?: string;
};

export type ProductionQuote = {
  id: string;
  userId: string;
  hcProjectId: string;
  storyboardId: string;
  totalCredits: number;
  issuedAt: string;
  expiresAt: string;
  sceneCount: number;
  totalDurationSeconds: number;
  methods: ProductionQuoteMethod[];
  referenceVideoDurationSeconds: number;
  nonReferenceVideoSceneCount: number;
  signature: string;
};

export type ProductionQuoteDraft = Omit<ProductionQuote, "signature">;

export function productionQuoteId(input: {
  userId: string;
  hcProjectId: string;
  storyboardId: string;
  scenes: ProductionQuoteScene[];
  options: ProductionQuoteOptions;
  totalCredits: number;
}): string {
  const scenes = [...input.scenes]
    .map((scene) => ({
      sceneId: scene.sceneId,
      order: scene.order,
      durationSeconds: scene.durationSeconds,
      method: scene.method,
      characterIds: [...scene.characterIds].sort(),
    }))
    .sort((a, b) => a.order - b.order || a.sceneId.localeCompare(b.sceneId));
  return createHash("sha256")
    .update(
      JSON.stringify({
        userId: input.userId,
        hcProjectId: input.hcProjectId,
        storyboardId: input.storyboardId,
        scenes,
        options: input.options,
        totalCredits: input.totalCredits,
      })
    )
    .digest("hex");
}

export function quoteDurationSummary(scenes: ProductionQuoteScene[]): {
  sceneCount: number;
  totalDurationSeconds: number;
  methods: ProductionQuoteMethod[];
  referenceVideoDurationSeconds: number;
  nonReferenceVideoSceneCount: number;
} {
  const methods: ProductionQuoteMethod[] = [];
  let referenceVideoDurationSeconds = 0;
  let nonReferenceVideoSceneCount = 0;
  let totalDurationSeconds = 0;
  for (const scene of scenes) {
    totalDurationSeconds += scene.durationSeconds;
    if (!methods.includes(scene.method)) methods.push(scene.method);
    if (scene.method === "reference") referenceVideoDurationSeconds += scene.durationSeconds;
    else nonReferenceVideoSceneCount += 1;
  }
  return {
    sceneCount: scenes.length,
    totalDurationSeconds,
    methods,
    referenceVideoDurationSeconds,
    nonReferenceVideoSceneCount,
  };
}

function canonicalQuote(quote: ProductionQuoteDraft): string {
  return [
    quote.id,
    quote.userId,
    quote.hcProjectId,
    quote.storyboardId,
    quote.totalCredits,
    quote.issuedAt,
    quote.expiresAt,
    quote.sceneCount,
    quote.totalDurationSeconds,
    quote.methods.join(","),
    quote.referenceVideoDurationSeconds,
    quote.nonReferenceVideoSceneCount,
  ].join("|");
}

export function signProductionQuote(quote: ProductionQuoteDraft, secret: string): string {
  return createHmac("sha256", secret).update(canonicalQuote(quote)).digest("hex");
}

export function issueProductionQuote(input: {
  userId: string;
  hcProjectId: string;
  storyboardId: string;
  scenes: ProductionQuoteScene[];
  options: ProductionQuoteOptions;
  totalCredits: number;
  nowMs: number;
  secret: string;
}): ProductionQuote {
  const summary = quoteDurationSummary(input.scenes);
  const issuedAt = new Date(input.nowMs).toISOString();
  const draft: ProductionQuoteDraft = {
    id: productionQuoteId({
      userId: input.userId,
      hcProjectId: input.hcProjectId,
      storyboardId: input.storyboardId,
      scenes: input.scenes,
      options: input.options,
      totalCredits: input.totalCredits,
    }),
    userId: input.userId,
    hcProjectId: input.hcProjectId,
    storyboardId: input.storyboardId,
    totalCredits: input.totalCredits,
    issuedAt,
    expiresAt: new Date(input.nowMs + PRODUCTION_QUOTE_TTL_MS).toISOString(),
    ...summary,
  };
  return { ...draft, signature: signProductionQuote(draft, input.secret) };
}

function signaturesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type ProductionQuoteDecision =
  | { ok: true }
  | { ok: false; code: "QUOTE_REQUIRED" | "QUOTE_INVALID" | "QUOTE_EXPIRED" | "QUOTE_CHANGED" };

/** The presented quote must be the quote the server just calculated. */
export function assessPresentedProductionQuote(input: {
  secret: string;
  nowMs: number;
  presented: ProductionQuote | null;
  current: ProductionQuoteDraft;
}): ProductionQuoteDecision {
  const presented = input.presented;
  if (!presented?.id || !presented.signature) {
    return { ok: false, code: "QUOTE_REQUIRED" };
  }
  const expected = signProductionQuote(
    {
      id: presented.id,
      userId: presented.userId,
      hcProjectId: presented.hcProjectId,
      storyboardId: presented.storyboardId,
      totalCredits: presented.totalCredits,
      issuedAt: presented.issuedAt,
      expiresAt: presented.expiresAt,
      sceneCount: presented.sceneCount,
      totalDurationSeconds: presented.totalDurationSeconds,
      methods: presented.methods,
      referenceVideoDurationSeconds: presented.referenceVideoDurationSeconds,
      nonReferenceVideoSceneCount: presented.nonReferenceVideoSceneCount,
    },
    input.secret
  );
  if (!signaturesMatch(presented.signature, expected)) {
    return { ok: false, code: "QUOTE_INVALID" };
  }
  if (
    presented.userId !== input.current.userId ||
    presented.hcProjectId !== input.current.hcProjectId
  ) {
    return { ok: false, code: "QUOTE_INVALID" };
  }
  if (
    presented.id !== input.current.id ||
    presented.storyboardId !== input.current.storyboardId ||
    presented.totalCredits !== input.current.totalCredits
  ) {
    return { ok: false, code: "QUOTE_CHANGED" };
  }
  if (Date.parse(presented.expiresAt) <= input.nowMs) {
    return { ok: false, code: "QUOTE_EXPIRED" };
  }
  return { ok: true };
}

/** One open quote reservation is reused. A settled quote cannot start another production. */
export function quoteReservationDecision(
  state: "none" | "open" | "settled"
): "reserve" | "reuse" | "reject" {
  if (state === "open") return "reuse";
  if (state === "settled") return "reject";
  return "reserve";
}
