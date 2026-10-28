import { NextResponse } from "next/server";
import { apiServiceUnavailable } from "@/server/api-error-response";
import { applySkipSilentSsoCookie } from "@/lib/identity/sso/silent-guard";
import { clearSession } from "@/server/auth/session";
import { homecheffIdentityOrigin } from "@/lib/identity/sso/exchange-client";
import { resolveStudioLogoutScope, studioLogoutResponse } from "@/server/auth/preview-local-auth";

/**
 * U5/U6 — Studio logout defaults to ecosystem scope (clears IdP via client).
 * Pass `{ ecosystem: false }` for rare product-only logout (compat).
 */
export async function POST(req: Request) {
  let requestedEcosystem = true;
  try {
    const body = (await req.json().catch(() => null)) as { ecosystem?: boolean } | null;
    if (body && body.ecosystem === false) requestedEcosystem = false;
  } catch {
    /* default */
  }

  const scope = resolveStudioLogoutScope(requestedEcosystem);

  try {
    await clearSession();
  } catch (error) {
    return apiServiceUnavailable("auth/logout", error);
  }

  const identityOrigin =
    scope === "ecosystem" && process.env.HOMECHEFF_IDENTITY_ORIGIN?.trim()
      ? homecheffIdentityOrigin()
      : null;
  const res = NextResponse.json(
    identityOrigin
      ? studioLogoutResponse("ecosystem", identityOrigin)
      : studioLogoutResponse("studio_only", ""),
  );
  applySkipSilentSsoCookie(res);
  if (identityOrigin) {
    console.info(
      JSON.stringify({
        event: "ecosystem_logout",
        product: "studio",
        result: "product_cleared",
      }),
    );
  }
  return res;
}
