/**
 * SP.2B.5 — GET /auth/sso/silent
 * One-shot automatic silent SSO for private Studio entry / login hydration.
 * Public marketing routes must NOT call this.
 */

import { NextResponse } from "next/server";
import { isCentralSsoLive } from "@/lib/identity/flags";
import { validateStudioReturnTo } from "@/lib/identity/return-path";
import { logStudioSsoEvent } from "@/lib/identity/sso/observability";
import {
  applySilentSsoAttemptCookie,
  canAttemptSilentSso,
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = validateStudioReturnTo(
    url.searchParams.get("returnTo") ?? url.searchParams.get("next"),
  );
  const origin = appOrigin(req);

  const user = await getAuthenticatedUser();
  if (user) {
    logStudioSsoEvent("product_session_reused", { phase: "silent_entry" });
    return NextResponse.redirect(new URL(returnTo, origin), 302);
  }

  if (!isCentralSsoLive()) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(returnTo)}`, origin), 302);
  }

  const cookieHeader = req.headers.get("cookie");
  if (!canAttemptSilentSso(cookieHeader)) {
    logStudioSsoEvent("silent_sso_loop_prevented", { phase: "silent_entry" });
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(returnTo)}`, origin), 302);
  }

  logStudioSsoEvent("silent_sso_attempt", { phase: "silent_entry" });
  const start = new URL("/auth/sso/start", origin);
  start.searchParams.set("returnTo", returnTo);
  start.searchParams.set("interaction", "silent");
  start.searchParams.set("intent", "login");

  const res = NextResponse.redirect(start.toString(), 302);
  applySilentSsoAttemptCookie(res);
  return res;
}
