/**
 * SP.2B — GET /auth/sso/callback
 * Validate state → exchange → resolve OR stage claim confirm → studio_session → redirect.
 */

import { NextResponse } from "next/server";
import { isCentralSsoLive } from "@/lib/identity/flags";
import { hasStudioWelcomeCookie } from "@/lib/identity/studio-welcome";
import {
  StudioSsoError,
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

export async function GET(req: Request) {
  if (!isCentralSsoLive()) {
    return errorRedirect(req, "SSO_DISABLED");
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return errorRedirect(req, "SSO_INVALID");
  }

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
    const c =
      err instanceof StudioSsoError ? err.code : ("SSO_STATE_REJECTED" as StudioSsoErrorCode);
    return errorRedirect(req, c);
  }

  if (pending.state !== state) {
    return errorRedirect(req, "SSO_STATE_REJECTED");
  }

  try {
    logStudioSsoEvent("sso_callback_received", {
      intent: pending.intent ?? "login",
    });

    const claims = await exchangeHomeCheffSsoCode({
      code,
      codeVerifier: pending.codeVerifier,
    });

    if (pending.intent === "claim" && pending.claimStudioUserId) {
      // Dual proof at callback: Studio session must still be the claim target.
      const sessionUser = await getAuthenticatedUser();
      if (!sessionUser || sessionUser.id !== pending.claimStudioUserId) {
        throw new StudioSsoError("CLAIM_UNAUTHORIZED");
      }

      // Stage confirmation — never silently link on callback alone (SP.2B.3).
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
    applyStudioSessionToResponse(res, user.id);
    logStudioSsoEvent("sso_success", { phase: "login" });
    return res;
  } catch (err) {
    const c: StudioSsoErrorCode =
      err instanceof StudioSsoError ? err.code : "EXCHANGE_FAILED";
    if (c === "IDENTITY_NOT_LINKED") {
      logStudioSsoEvent("identity_not_linked", {});
    }
    logStudioSsoEvent("sso_failure", { code: c });
    return errorRedirect(req, c);
  }
}
