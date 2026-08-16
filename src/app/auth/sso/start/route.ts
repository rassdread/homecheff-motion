/**
 * SP.2B / SP.2D-C5 — GET /auth/sso/start
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
 *
 * SP.2D-C5: PKCE/pending mint shared via begin-homecheff-sso (silent collapses here).
 */

import { NextResponse } from "next/server";
import { isCentralSsoLive } from "@/lib/identity/flags";
import { validateStudioReturnTo } from "@/lib/identity/return-path";
import {
  beginHomeCheffSsoRedirect,
  mintStudioHomeCheffSsoBegin,
} from "@/lib/identity/sso/begin-homecheff-sso";
import { StudioSsoError } from "@/lib/identity/sso/errors";
import { homecheffIdentityOrigin } from "@/lib/identity/sso/exchange-client";
import { logStudioSsoEvent } from "@/lib/identity/sso/observability";
import { applySsoPendingCookie, type SsoPendingIntent } from "@/lib/identity/sso/state";
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
    const mode = (url.searchParams.get("mode") ?? "").trim().toLowerCase();

    let claimStudioUserId: string | undefined;
    if (intent === "claim") {
      const sessionUser = await getAuthenticatedUser();
      if (!sessionUser || sessionUser.isActive === false) {
        throw new StudioSsoError("CLAIM_UNAUTHORIZED");
      }
      claimStudioUserId = sessionUser.id;
    }

    const clearSkipSilent = interaction !== "silent" || mode === "ecosystem";

    logStudioSsoEvent("sso_interaction_started", {
      intent,
      interaction,
      hasEmailHint: Boolean(emailHint),
    });

    // Prefill HC login when Studio collected an email (hint only — not identity proof).
    if (intent === "login" && emailHint) {
      const minted = mintStudioHomeCheffSsoBegin({
        returnTo,
        interaction,
        intent,
        claimStudioUserId,
        clearSkipSilent,
        loginHint: emailHint,
      });
      const authorize = new URL(minted.hcAuthorizeUrl);
      const login = new URL(`${homecheffIdentityOrigin()}/login`);
      login.searchParams.set("email", emailHint);
      login.searchParams.set("callbackUrl", `${authorize.pathname}${authorize.search}`);
      login.searchParams.set("ssoInteraction", interaction);
      if (interaction !== "silent") {
        login.searchParams.set("prompt", "select_account");
      }
      logStudioSsoEvent("email_login_selected", { hasEmailHint: true });
      const res = NextResponse.redirect(login.toString(), 302);
      applySsoPendingCookie(res, minted.encodedPending);
      if (clearSkipSilent) clearSkipSilentSsoCookie(res);
      return res;
    }

    if (intentRaw === "google") {
      logStudioSsoEvent("google_account_selected", { phase: "start" });
    }

    return beginHomeCheffSsoRedirect({
      returnTo,
      interaction,
      intent,
      claimStudioUserId,
      clearSkipSilent,
      loginHint: emailHint,
    });
  } catch (err) {
    const code = err instanceof StudioSsoError ? err.code : "CONFIG_ERROR";
    return errorRedirect(code);
  }
}
