import { homecheffIdentityOrigin } from "@/lib/identity/sso/exchange-client";

export type LegacyMigrateClientResult =
  | {
      ok: true;
      centralUserId: string;
      outcome: string;
      redeemUrl: string;
    }
  | { ok: false; code: string; status: number };

export async function callMarketplaceLegacyMigrate(input: {
  sourceUserId: string;
  email: string;
  passwordPlaintext: string;
  returnTo: string;
}): Promise<LegacyMigrateClientResult> {
  const secret = process.env.STUDIO_SSO_CLIENT_SECRET?.trim();
  if (!secret) {
    return { ok: false, code: "CONFIG_ERROR", status: 503 };
  }
  const origin = homecheffIdentityOrigin();
  const res = await fetch(`${origin}/api/internal/identity/legacy-migrate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sourceProduct: "studio",
      sourceUserId: input.sourceUserId,
      email: input.email,
      passwordPlaintext: input.passwordPlaintext,
      returnProduct: "studio",
      returnTo: input.returnTo,
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    centralUserId?: string;
    outcome?: string;
    redeemTicket?: string;
    code?: string;
  } | null;

  if (!res.ok || !data?.ok || !data.centralUserId || !data.redeemTicket) {
    return {
      ok: false,
      code: data?.code || "MIGRATE_FAILED",
      status: res.status || 502,
    };
  }

  return {
    ok: true,
    centralUserId: data.centralUserId,
    outcome: data.outcome || "UNKNOWN",
    redeemUrl: `${origin}/auth/legacy-migrate?ticket=${encodeURIComponent(data.redeemTicket)}`,
  };
}
