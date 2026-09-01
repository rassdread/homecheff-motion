/**
 * Motion → Growth internal Studio HC/billing API client.
 */
import { homecheffIdentityOrigin } from "@/lib/identity/sso/exchange-client";

const TIMEOUT_MS = 8_000;

function internalSecret(): string {
  return (
    process.env.STUDIO_HC_INTERNAL_SECRET?.trim() ??
    process.env.HC_INTERNAL_PROBE_SECRET?.trim() ??
    ""
  );
}

function baseHeaders(centralUserId: string): Record<string, string> {
  const secret = internalSecret();
  const bypass = process.env.HOMECHEFF_VERCEL_BYPASS_SECRET?.trim();
  return {
    "Content-Type": "application/json",
    "x-studio-hc-internal-secret": secret,
    "x-studio-central-user-id": centralUserId,
    ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}),
  };
}

async function growthFetch(path: string, init: RequestInit & { centralUserId?: string } = {}) {
  const origin = homecheffIdentityOrigin();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers = {
      ...baseHeaders(init.centralUserId ?? ""),
      ...(init.headers as Record<string, string> | undefined),
    };
    const res = await fetch(`${origin}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: init.signal ?? controller.signal,
    });
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchStudioNlCatalogFromGrowth() {
  return growthFetch("/api/internal/studio/billing/catalog", { method: "GET", centralUserId: "system" });
}

export async function fetchHcWalletFromGrowth(centralUserId: string) {
  return growthFetch("/api/internal/studio/hc/wallet", {
    method: "GET",
    centralUserId,
  });
}

export async function fetchHcQuoteFromGrowth(action: string) {
  const q = encodeURIComponent(action);
  return growthFetch(`/api/internal/studio/hc/quote?action=${q}`, {
    method: "GET",
    centralUserId: "system",
  });
}

export async function reserveHcOnGrowth(input: {
  centralUserId: string;
  action: string;
  operation: string;
  provider: string;
  providerSku?: string;
  jobId?: string;
  idempotencyKey: string;
  legacyStudioCredits?: number;
}) {
  return growthFetch("/api/internal/studio/hc/reserve", {
    method: "POST",
    centralUserId: input.centralUserId,
    body: JSON.stringify(input),
  });
}

export async function captureHcOnGrowth(input: {
  centralUserId: string;
  reservationId: string;
  idempotencyKey: string;
}) {
  return growthFetch("/api/internal/studio/hc/capture", {
    method: "POST",
    centralUserId: input.centralUserId,
    body: JSON.stringify({
      reservationId: input.reservationId,
      idempotencyKey: input.idempotencyKey,
      actorCentralUserId: input.centralUserId,
    }),
  });
}

export async function releaseHcOnGrowth(input: {
  centralUserId: string;
  reservationId: string;
  idempotencyKey: string;
}) {
  return growthFetch("/api/internal/studio/hc/release", {
    method: "POST",
    centralUserId: input.centralUserId,
    body: JSON.stringify({
      reservationId: input.reservationId,
      idempotencyKey: input.idempotencyKey,
      actorCentralUserId: input.centralUserId,
    }),
  });
}

export async function createCentralStudioCheckout(input: {
  centralUserId: string;
  studioUserId: string;
  email: string;
  planKey: "creator" | "pro" | "studio";
  billingCountry: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return growthFetch("/api/internal/studio/billing/checkout", {
    method: "POST",
    centralUserId: input.centralUserId,
    body: JSON.stringify(input),
  });
}
