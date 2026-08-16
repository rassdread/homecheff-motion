/**
 * SP.2B.5 / SP.2B.7 / SP.2B.10 / SP.2D-C5 — GET /auth/sso/silent
 * One-shot automatic silent SSO.
 *
 * mode=public: on failure stay on public returnTo (never force /login).
 * mode=ecosystem: Ontdek switcher entry — clears logout/attempt suppression.
 *
 * SP.2D-C5: silent mints PKCE/pending and 302s directly to HC (no Studio start hop).
 */

import { NextResponse } from "next/server";
import { isCentralSsoLive } from "@/lib/identity/flags";
import {
  isPublicStudioSurface,
  validateStudioReturnTo,
} from "@/lib/identity/return-path";
import { beginHomeCheffSsoRedirect } from "@/lib/identity/sso/begin-homecheff-sso";
import { logStudioSsoEvent } from "@/lib/identity/sso/observability";
import {
  applySilentSsoAttemptCookie,
  canAttemptSilentSso,
  clearSilentSsoAttemptCookie,
} from "@/lib/identity/sso/silent-guard";
import { getAuthenticatedUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

function appOrigin(req: Request): string {
  const env =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_STUDIO_URL?.trim() ||
    process.env.PUBLIC_BASE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return new URL(req.url).origin;
}

function failRedirect(
  req: Request,
  returnTo: string,
  publicMode: boolean,
): NextResponse {
  const origin = appOrigin(req);
  if (publicMode || isPublicStudioSurface(returnTo)) {
    return NextResponse.redirect(new URL(returnTo, origin), 302);
  }
  return NextResponse.redirect(
    new URL(`/login?next=${encodeURIComponent(returnTo)}`, origin),
    302,
  );
}

function redirectSilentToHomeCheff(opts: {
  returnTo: string;
  ecosystemMode: boolean;
  publicMode: boolean;
}): NextResponse {
  const res = beginHomeCheffSsoRedirect({
    returnTo: opts.returnTo,
    interaction: "silent",
    intent: "login",
    clearSkipSilent: opts.ecosystemMode,
  });
  if (opts.ecosystemMode) {
    clearSilentSsoAttemptCookie(res);
  }
  applySilentSsoAttemptCookie(res);
  logStudioSsoEvent("silent_sso_attempt", {
    phase: opts.ecosystemMode
      ? "ecosystem_entry"
      : opts.publicMode
        ? "public_hydrate"
        : "silent_entry",
  });
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = validateStudioReturnTo(
    url.searchParams.get("returnTo") ?? url.searchParams.get("next"),
  );
  const modeRaw = (url.searchParams.get("mode") ?? "").trim().toLowerCase();
  const publicMode = modeRaw === "public";
  const ecosystemMode = modeRaw === "ecosystem";
  const origin = appOrigin(req);

  const user = await getAuthenticatedUser();
  if (user) {
    logStudioSsoEvent("product_session_reused", { phase: "silent_entry" });
    return NextResponse.redirect(new URL(returnTo, origin), 302);
  }

  if (!isCentralSsoLive()) {
    return failRedirect(req, returnTo, publicMode || ecosystemMode);
  }

  if (ecosystemMode) {
    return redirectSilentToHomeCheff({
      returnTo,
      ecosystemMode: true,
      publicMode: false,
    });
  }

  const cookieHeader = req.headers.get("cookie");
  if (!canAttemptSilentSso(cookieHeader)) {
    logStudioSsoEvent("silent_sso_loop_prevented", {
      phase: publicMode ? "public_hydrate" : "silent_entry",
    });
    return failRedirect(req, returnTo, publicMode);
  }

  return redirectSilentToHomeCheff({
    returnTo,
    ecosystemMode: false,
    publicMode,
  });
}
