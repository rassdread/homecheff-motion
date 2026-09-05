/**
 * Studio → Growth ecosystem affiliate internal calls.
 */
import { homecheffIdentityOrigin } from "@/lib/identity/sso/exchange-client";

function internalSecret(): string {
  return (
    process.env.STUDIO_HC_INTERNAL_SECRET?.trim() ??
    process.env.HC_INTERNAL_PROBE_SECRET?.trim() ??
    ""
  );
}

export async function growthFetchJson(
  path: string,
  init: {
    method?: string;
    centralUserId: string;
    body?: unknown;
  },
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const origin = process.env.HOMECHEFF_GROWTH_ORIGIN?.trim() || homecheffIdentityOrigin();
  const secret = internalSecret();
  const bypass = process.env.HOMECHEFF_VERCEL_BYPASS_SECRET?.trim();
  const method = init.method ?? "POST";
  const res = await fetch(`${origin}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-studio-hc-internal-secret": secret,
      "x-hc-ecosystem-internal-secret": secret,
      "x-hc-internal-secret": secret,
      "x-studio-central-user-id": init.centralUserId,
      ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}),
    },
    body: init.body !== undefined && method !== "GET" ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}
