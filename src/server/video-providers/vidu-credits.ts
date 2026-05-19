import { assertViduApiKeyPresent, viduBaseUrl } from "@/server/video-providers/vidu-config";

export type ViduCreditBalanceResult = {
  ok: boolean;
  credits?: number;
  rawBalance?: unknown;
  error?: string;
  checkedAt: string;
};

const CACHE_TTL_MS = 60_000;

let cached: { result: ViduCreditBalanceResult; expiresAt: number } | null = null;

function sumRemainingCredits(json: unknown): number | undefined {
  if (!json || typeof json !== "object") {
    return undefined;
  }
  const record = json as Record<string, unknown>;
  const remains = record.remaining_credits ?? record.remains;
  if (!Array.isArray(remains)) {
    return undefined;
  }
  let total = 0;
  let found = false;
  for (const item of remains) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const creditRemain = (item as Record<string, unknown>).credit_remain;
    if (typeof creditRemain === "number" && Number.isFinite(creditRemain)) {
      total += creditRemain;
      found = true;
    }
  }
  return found ? total : undefined;
}

function extractViduErrorMessage(json: unknown, fallback: string): string {
  if (!json || typeof json !== "object") {
    return fallback;
  }
  const record = json as Record<string, unknown>;
  for (const key of ["message", "error", "err_msg", "detail"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return fallback;
}

async function fetchViduCreditsFromApi(): Promise<unknown> {
  assertViduApiKeyPresent();
  const base = viduBaseUrl();
  const url = `${base}/ent/v2/credits?show_detail=false`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Token ${process.env.VIDU_API_KEY!.trim()}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!response.ok) {
    const message = extractViduErrorMessage(json, `Vidu credits API returned HTTP ${response.status}`);
    throw new Error(message);
  }
  return json;
}

/** Fetch Vidu account credit balance (server-side only). Cached 60s by default. */
export async function getViduCreditBalance(options?: {
  bypassCache?: boolean;
}): Promise<ViduCreditBalanceResult> {
  const now = Date.now();
  if (!options?.bypassCache && cached && cached.expiresAt > now) {
    return cached.result;
  }

  const checkedAt = new Date().toISOString();

  try {
    const rawBalance = await fetchViduCreditsFromApi();
    const credits = sumRemainingCredits(rawBalance);
    const result: ViduCreditBalanceResult = {
      ok: credits !== undefined,
      credits,
      rawBalance,
      checkedAt,
      ...(credits === undefined ? { error: "Could not parse remaining credits from Vidu response." } : {}),
    };
    if (result.ok) {
      cached = { result, expiresAt: now + CACHE_TTL_MS };
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not fetch video credit balance.";
    return {
      ok: false,
      error: message,
      checkedAt,
    };
  }
}
