/**
 * SP.2B — GET /auth/sso/start
 * PKCE + state → HomeCheff SSO issuer (product=studio).
 *
 * intent=login (default): open Studio SSO / email-hint presentation.
 * intent=claim: dual-proof legacy claim — requires authenticated Studio session;
 *   pending cookie binds claimStudioUserId to that session user only.
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
  type SsoPendingIntent,
} from "@/lib/identity/sso/state";
import { getAuthenticatedUser } from "@/server/auth/session";

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

function normalizeEmailHint(raw: string | null): string | null {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  if (!email || !email.includes("@") || email.length > 254) return null;
  return email;
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
    const emailHint = normalizeEmailHint(url.searchParams.get("email"));
    const intentRaw = (url.searchParams.get("intent") ?? "login").trim().toLowerCase();
    const intent: SsoPendingIntent = intentRaw === "claim" ? "claim" : "login";

    let claimStudioUserId: string | undefined;
    if (intent === "claim") {
      const sessionUser = await getAuthenticatedUser();
      if (!sessionUser || sessionUser.isActive === false) {
        throw new StudioSsoError("CLAIM_UNAUTHORIZED");
      }
      claimStudioUserId = sessionUser.id;
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = codeChallengeS256(codeVerifier);
    const redirectUri = studioSsoRedirectUri();

    const pending = buildSsoPending({
      state,
      codeVerifier,
      returnTo,
      intent,
      claimStudioUserId,
    });
    const encoded = encodeSsoPending(pending);

    const start = new URL(`${homecheffIdentityOrigin()}/auth/sso/start`);
    start.searchParams.set("product", "studio");
    start.searchParams.set("redirect_uri", redirectUri);
    start.searchParams.set("state", state);
    start.searchParams.set("code_challenge", codeChallenge);
    start.searchParams.set("code_challenge_method", "S256");

    // Prefill HC login when Studio collected an email (login presentation only).
    let destination = start.toString();
    if (intent === "login" && emailHint) {
      const login = new URL(`${homecheffIdentityOrigin()}/login`);
      login.searchParams.set("email", emailHint);
      login.searchParams.set("callbackUrl", `${start.pathname}${start.search}`);
      destination = login.toString();
    }

    const res = NextResponse.redirect(destination, 302);
    applySsoPendingCookie(res, encoded);
    return res;
  } catch (err) {
    const code = err instanceof StudioSsoError ? err.code : "CONFIG_ERROR";
    return errorRedirect(code);
  }
}
