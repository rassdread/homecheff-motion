/**
 * Central HC adapter for Motion — delegates to Growth internal APIs (single ledger).
 * Replaces THROW_STUB; active when CENTRAL_STUDIO_TECHNICAL_READY + HC spend flags on Growth.
 */
import {
  captureHcOnGrowth,
  fetchHcQuoteFromGrowth,
  fetchHcWalletFromGrowth,
  grantPackHcOnGrowth,
  releaseHcOnGrowth,
  reserveHcOnGrowth,
} from "@/lib/studio-homecheff-hc-fetch";
import { STUDIO_NL_HC_ACTION_TARGETS } from "@/lib/studio-nl-b2c-catalog";
import { isCentralStudioTechnicalReady } from "@/lib/studio-central-billing-flags";

export class HcCentralAdapterNotReadyError extends Error {
  readonly code = "HC_CENTRAL_ADAPTER_NOT_READY";
  constructor() {
    super("Central HC adapter requires CENTRAL_STUDIO_TECHNICAL_READY on Motion and Growth.");
    this.name = "HcCentralAdapterNotReadyError";
  }
}

export function isHcCentralAdapterReady(): boolean {
  return isCentralStudioTechnicalReady();
}

export async function getCentralHcQuote(action: string): Promise<{ action: string; hc: number }> {
  if (!isHcCentralAdapterReady()) throw new HcCentralAdapterNotReadyError();
  const res = await fetchHcQuoteFromGrowth(action);
  if (!res.ok || !res.json || typeof res.json !== "object" || !(res.json as { hc?: number }).hc) {
    const target = (STUDIO_NL_HC_ACTION_TARGETS as Record<string, number>)[action];
    if (typeof target === "number") return { action, hc: target };
    throw new Error(`HC_QUOTE_FAILED:${action}`);
  }
  const json = res.json as { action: string; hc: number };
  return { action: json.action, hc: json.hc };
}

export async function getCentralHcWallet(centralUserId: string) {
  if (!isHcCentralAdapterReady()) throw new HcCentralAdapterNotReadyError();
  const res = await fetchHcWalletFromGrowth(centralUserId);
  if (!res.ok) throw new Error("HC_WALLET_READ_FAILED");
  return res.json as { availableHc: number; reservedHc: number };
}

export async function reserveCentralHc(input: {
  centralUserId: string;
  action: string;
  operation: string;
  provider: string;
  providerSku?: string;
  jobId?: string;
  idempotencyKey: string;
  legacyStudioCredits?: number;
}) {
  if (!isHcCentralAdapterReady()) throw new HcCentralAdapterNotReadyError();
  const res = await reserveHcOnGrowth(input);
  if (!res.ok) {
    const code =
      res.json && typeof res.json === "object" && "code" in res.json
        ? String((res.json as { code: string }).code)
        : "RESERVE_FAILED";
    throw new Error(code);
  }
  return res.json;
}

export async function captureCentralHc(input: {
  centralUserId: string;
  reservationId: string;
  idempotencyKey: string;
}) {
  if (!isHcCentralAdapterReady()) throw new HcCentralAdapterNotReadyError();
  const res = await captureHcOnGrowth(input);
  if (!res.ok) throw new Error("CAPTURE_FAILED");
  return res.json;
}

export async function releaseCentralHc(input: {
  centralUserId: string;
  reservationId: string;
  idempotencyKey: string;
}) {
  if (!isHcCentralAdapterReady()) throw new HcCentralAdapterNotReadyError();
  const res = await releaseHcOnGrowth(input);
  if (!res.ok) throw new Error("RELEASE_FAILED");
  return res.json;
}

export async function grantCentralPackHc(input: {
  centralUserId: string;
  studioUserId: string;
  packId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string | null;
  stripePriceId?: string | null;
  grossPriceCents: number;
  currency?: string;
  purchasePaidAtIso?: string;
}) {
  if (!isHcCentralAdapterReady()) throw new HcCentralAdapterNotReadyError();
  const res = await grantPackHcOnGrowth(input);
  if (!res.ok) {
    const code =
      res.json && typeof res.json === "object" && "code" in res.json
        ? String((res.json as { code: string }).code)
        : "PACK_GRANT_FAILED";
    throw new Error(code);
  }
  return res.json;
}

/** Server-authoritative HC for certified actions when central path is ready. */
export function resolveAuthoritativeHcForAction(action: string): number | null {
  if (!isHcCentralAdapterReady()) return null;
  const target = (STUDIO_NL_HC_ACTION_TARGETS as Record<string, number>)[action];
  return typeof target === "number" ? target : null;
}
