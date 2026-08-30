/**
 * SP.2B — GET /auth/sso/callback
 * Validate state → exchange → resolve OR stage claim confirm → studio_session → redirect.
 * SP.2B.5: silent login_required → safe /login (no error UI, no loop).
 * SP.2B.8: auth PASS + missing product profile ≠ EXCHANGE_FAILED; DB/provision → RETRY_LATER.
 */

import { NextResponse } from "next/server";
import { isCentralSsoLive } from "@/lib/identity/flags";
import { hasStudioWelcomeCookie } from "@/lib/identity/studio-welcome";
import { isPublicStudioSurface } from "@/lib/identity/return-path";
import {
  StudioSsoError,
  mapUnknownStudioCallbackFailure,
  type StudioSsoErrorCode,
} from "@/lib/identity/sso/errors";
import {
  applyClaimPendingCookie,
  buildClaimPending,
  encodeClaimPending,
} from "@/lib/identity/sso/claim-pending";
import { exchangeHomeCheffSsoCode } from "@/lib/identity/sso/exchange-client";
import { resolveStudioUserFromCentralClaims } from "@/lib/identity/sso/resolve-user";
import {
  STUDIO_SSO_PENDING_COOKIE,
  clearSsoPendingCookie,
  decodeSsoPending,
} from "@/lib/identity/sso/state";
import { logStudioSsoEvent } from "@/lib/identity/sso/observability";
import {
  clearSilentSsoAttemptCookie,
  clearSkipSilentSsoCookie,
} from "@/lib/identity/sso/silent-guard";
import { applyStudioSessionToResponse, getAuthenticatedUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

function appOrigin(req: Request): string {
  const env =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_STUDIO_URL?.trim() ||
    process.env.PUBLIC_BASE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return new URL(req.url).origin;
}

function errorRedirect(req: Request, code: StudioSsoErrorCode): NextResponse {
  const url = new URL("/auth/sso/error", appOrigin(req));
  url.searchParams.set("code", code);
  const res = NextResponse.redirect(url, 302);
  clearSsoPendingCookie(res);
  return res;
}

function loginRedirect(req: Request, returnTo: string): NextResponse {
  const url = new URL("/login", appOrigin(req));
  url.searchParams.set("next", returnTo);
  const res = NextResponse.redirect(url, 302);
  clearSsoPendingCookie(res);
  return res;
}

/** SP.2B.7 — public hydrate: no HC session → stay public (do not force /login). */
function publicOrLoginRedirect(req: Request, returnTo: string): NextResponse {
  if (isPublicStudioSurface(returnTo)) {
    const res = NextResponse.redirect(new URL(returnTo, appOrigin(req)), 302);
    clearSsoPendingCookie(res);
    return res;
  }
  return loginRedirect(req, returnTo);
}

export async function GET(req: Request) {
  if (!isCentralSsoLive()) {
    return errorRedirect(req, "SSO_DISABLED");
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieHeader = req.headers.get("cookie") ?? "";
  const pendingRaw = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${STUDIO_SSO_PENDING_COOKIE}=`))
    ?.slice(STUDIO_SSO_PENDING_COOKIE.length + 1);

  let pending;
  try {
    pending = decodeSsoPending(pendingRaw ? decodeURIComponent(pendingRaw) : null);
  } catch (err) {
    // SP.2B.7 — missing pending + login_required must not show SSO error to public visitors.
    if (oauthError === "login_required") {
      logStudioSsoEvent("silent_sso_no_central_session", { reason: "no_pending" });
      return publicOrLoginRedirect(req, "/");
    }
    const c =
      err instanceof StudioSsoError ? err.code : ("SSO_STATE_REJECTED" as StudioSsoErrorCode);
    return errorRedirect(req, c);
  }

  // SP.2B.5 / SP.2B.7 — silent IdP: no HC session → public stay OR /login.
  if (oauthError === "login_required") {
    if (state && pending.state === state) {
      logStudioSsoEvent("silent_sso_no_central_session", {});
      return publicOrLoginRedirect(req, pending.returnTo);
    }
    logStudioSsoEvent("silent_sso_failure", { reason: "login_required_state_mismatch" });
    return publicOrLoginRedirect(req, "/");
  }

  if (!code || !state) {
    return errorRedirect(req, "SSO_INVALID");
  }

  if (pending.state !== state) {
    return errorRedirect(req, "SSO_STATE_REJECTED");
  }

  logStudioSsoEvent("sso_callback_received", {
    intent: pending.intent ?? "login",
  });

  let claims;
  try {
    claims = await exchangeHomeCheffSsoCode({
      code,
      codeVerifier: pending.codeVerifier,
    });
  } catch (err) {
    const c = mapUnknownStudioCallbackFailure(err, "exchange");
    logStudioSsoEvent("sso_failure", { code: c, phase: "exchange" });
    logStudioSsoEvent("silent_sso_failure", { code: c, phase: "exchange" });
    return errorRedirect(req, c);
  }

  try {
    if (pending.intent === "claim" && pending.claimStudioUserId) {
      const sessionUser = await getAuthenticatedUser();
      if (!sessionUser || sessionUser.id !== pending.claimStudioUserId) {
        throw new StudioSsoError("CLAIM_UNAUTHORIZED");
      }

      const claimPending = buildClaimPending({
        claimStudioUserId: pending.claimStudioUserId,
        centralUserId: claims.centralUserId,
        email: claims.email,
        displayName: claims.displayName,
        returnTo: pending.returnTo,
      });
      const res = NextResponse.redirect(
        new URL("/account/claim/confirm", appOrigin(req)),
        302,
      );
      clearSsoPendingCookie(res);
      applyClaimPendingCookie(res, encodeClaimPending(claimPending));
      logStudioSsoEvent("claim_identity_confirmed", { phase: "staged" });
      return res;
    }

    const user = await resolveStudioUserFromCentralClaims({
      centralUserId: claims.centralUserId,
      email: claims.email,
    });

    let nextPath = pending.returnTo;
    if (user.firstProductVisit && !hasStudioWelcomeCookie(cookieHeader)) {
      nextPath = `/welcome?next=${encodeURIComponent(pending.returnTo)}`;
    }

    const res = NextResponse.redirect(new URL(nextPath, appOrigin(req)), 302);
    clearSsoPendingCookie(res);
    clearSilentSsoAttemptCookie(res);
    clearSkipSilentSsoCookie(res);
    applyStudioSessionToResponse(res, user.id, {
      centralUserId: claims.centralUserId,
      ecoEpoch: claims.ecoEpoch,
    });
    logStudioSsoEvent(
      user.firstProductVisit ? "product_session_created" : "product_session_reused",
      { phase: "callback" },
    );
    logStudioSsoEvent("silent_sso_success", { phase: "callback" });
    logStudioSsoEvent("sso_success", { phase: "login" });
    return res;
  } catch (err) {
    const c = mapUnknownStudioCallbackFailure(err, "resolve");
    if (c === "IDENTITY_NOT_LINKED") {
      logStudioSsoEvent("identity_not_linked", {});
    }
    const errName = err instanceof Error ? err.name : "unknown";
    logStudioSsoEvent("sso_failure", {
      code: c,
      phase: "resolve",
      errName,
    });
    logStudioSsoEvent("silent_sso_failure", { code: c, phase: "resolve" });
    return errorRedirect(req, c);
  }
}
