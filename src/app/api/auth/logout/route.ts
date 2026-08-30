import { NextResponse } from "next/server";
import { apiServiceUnavailable } from "@/server/api-error-response";
import { applySkipSilentSsoCookie } from "@/lib/identity/sso/silent-guard";
import { clearSession } from "@/server/auth/session";
import { homecheffIdentityOrigin } from "@/lib/identity/sso/exchange-client";

/**
 * U5/U6 — Studio logout defaults to ecosystem scope (clears IdP via client).
 * Pass `{ ecosystem: false }` for rare product-only logout (compat).
 */
export async function POST(req: Request) {
  let ecosystem = true;
  try {
    const body = (await req.json().catch(() => null)) as { ecosystem?: boolean } | null;
    if (body && body.ecosystem === false) ecosystem = false;
  } catch {
    /* default */
  }

  try {
    await clearSession();
  } catch (error) {
    return apiServiceUnavailable("auth/logout", error);
  }

  if (!ecosystem) {
    const res = NextResponse.json({ ok: true, scope: "studio_only" });
    applySkipSilentSsoCookie(res);
    return res;
  }

  const res = NextResponse.json({
    ok: true,
    scope: "ecosystem",
    idpLogoutUrl: `${homecheffIdentityOrigin()}/api/auth/ecosystem-logout`,
  });
  applySkipSilentSsoCookie(res);
  console.info(
    JSON.stringify({
      event: "ecosystem_logout",
      product: "studio",
      result: "product_cleared",
    }),
  );
  return res;
}
