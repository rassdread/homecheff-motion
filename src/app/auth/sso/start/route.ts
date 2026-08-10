/**
 * SP.2B — GET /auth/sso/start
 * PKCE + state → HomeCheff SSO issuer (product=studio).
 *
 * intent=login (default): open Studio SSO / email-hint presentation.
 * intent=claim: dual-proof legacy claim — requires authenticated Studio session;
 *   pending cookie binds claimStudioUserId to that session user only.
 *
 * interaction (HC IdP):
 *   select_account — explicit login / Google / email (default for Studio buttons)
 *   claim — account linking (always confirm)
 *   silent — returning SSO only when explicitly requested
 */

import { NextResponse } from "next/server";
import { isCentralSsoLive } from "@/lib/identity/flags";
import { validateStudioReturnTo } from "@/lib/identity/return-path";
import { StudioSsoError } from "@/lib/identity/sso/errors";
import {
  homecheffIdentityOrigin,
  studioSsoRedirectUri,
} from "@/lib/identity/sso/exchange-client";
import { logStudioSsoEvent } from "@/lib/identity/sso/observability";
import { codeChallengeS256, generateCodeVerifier, generateState } from "@/lib/identity/sso/pkce";
import {
  applySsoPendingCookie,
  buildSsoPending,
  encodeSsoPending,
  type SsoPendingIntent,
} from "@/lib/identity/sso/state";
import { clearSkipSilentSsoCookie } from "@/lib/identity/sso/silent-guard";
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

function resolveInteraction(
  intent: SsoPendingIntent,
  raw: string | null,
): "silent" | "select_account" | "claim" {
  const v = (raw ?? "").trim().toLowerCase();
  if (intent === "claim") return "claim";
  if (v === "silent") return "silent";
  if (v === "claim") return "claim";
  if (v === "login" || v === "select_account") return "select_account";
  // Explicit Studio login buttons / default start → never silent-hijack HC session.
  return "select_account";
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
    const interaction = resolveInteraction(intent, url.searchParams.get("interaction"));

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
    start.searchParams.set("interaction", interaction);
    if (emailHint) start.searchParams.set("login_hint", emailHint);

    logStudioSsoEvent("sso_interaction_started", {
      intent,
      interaction,
      hasEmailHint: Boolean(emailHint),
    });

    // Prefill HC login when Studio collected an email (hint only — not identity proof).
    let destination = start.toString();
    if (intent === "login" && emailHint) {
      const login = new URL(`${homecheffIdentityOrigin()}/login`);
      login.searchParams.set("email", emailHint);
      login.searchParams.set("callbackUrl", `${start.pathname}${start.search}`);
      login.searchParams.set("ssoInteraction", interaction);
      if (interaction !== "silent") {
        login.searchParams.set("prompt", "select_account");
      }
      destination = login.toString();
      logStudioSsoEvent("email_login_selected", { hasEmailHint: true });
    } else if (intentRaw === "google") {
      logStudioSsoEvent("google_account_selected", { phase: "start" });
    }

    const res = NextResponse.redirect(destination, 302);
    applySsoPendingCookie(res, encoded);
    // Explicit login/switch/claim clears post-logout skip so the new auth can complete.
    if (interaction !== "silent") {
      clearSkipSilentSsoCookie(res);
    }
    return res;
  } catch (err) {
    const code = err instanceof StudioSsoError ? err.code : "CONFIG_ERROR";
    return errorRedirect(code);
  }
}
