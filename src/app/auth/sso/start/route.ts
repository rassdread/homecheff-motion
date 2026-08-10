/**
 * SP.2B — GET /auth/sso/start
 * PKCE + state → HomeCheff /auth/sso/start?product=studio
 */

import { NextResponse } from "next/server";
import { isCentralSsoLive } from "@/lib/identity/flags";
import { validateStudioReturnTo } from "@/lib/identity/return-path";
import { StudioSsoError } from "@/lib/identity/sso/errors";
import {
  homecheffIdentityOrigin,
  studioSsoRedirectUri,
} from "@/lib/identity/sso/exchange-client";
import { codeChallengeS256, generateCodeVerifier, generateState } from "@/lib/identity/sso/pkce";
import {
  applySsoPendingCookie,
  buildSsoPending,
  encodeSsoPending,
} from "@/lib/identity/sso/state";

export const dynamic = "force-dynamic";

function errorRedirect(code: string): NextResponse {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_STUDIO_URL?.trim() ||
    "http://localhost:3000";
  const url = new URL("/auth/sso/error", origin.replace(/\/$/, ""));
  url.searchParams.set("code", code);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  if (!isCentralSsoLive()) {
    return errorRedirect("SSO_DISABLED");
  }

  try {
    const url = new URL(req.url);
    const returnTo = validateStudioReturnTo(
      url.searchParams.get("returnTo") ?? url.searchParams.get("next"),
    );
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = codeChallengeS256(codeVerifier);
    const redirectUri = studioSsoRedirectUri();

    const pending = buildSsoPending({ state, codeVerifier, returnTo });
    const encoded = encodeSsoPending(pending);

    const start = new URL(`${homecheffIdentityOrigin()}/auth/sso/start`);
    start.searchParams.set("product", "studio");
    start.searchParams.set("redirect_uri", redirectUri);
    start.searchParams.set("state", state);
    start.searchParams.set("code_challenge", codeChallenge);
    start.searchParams.set("code_challenge_method", "S256");

    const res = NextResponse.redirect(start.toString(), 302);
    applySsoPendingCookie(res, encoded);
    return res;
  } catch (err) {
    const code = err instanceof StudioSsoError ? err.code : "CONFIG_ERROR";
    return errorRedirect(code);
  }
}
