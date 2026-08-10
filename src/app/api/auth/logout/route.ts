import { NextResponse } from "next/server";
import { apiServiceUnavailable } from "@/server/api-error-response";
import { applySkipSilentSsoCookie } from "@/lib/identity/sso/silent-guard";
import { clearSession } from "@/server/auth/session";

/**
 * Studio-local logout: clears studio_session only.
 * Sets skip_silent_sso so /login does not immediately silent-SSO the user back in
 * while a HomeCheff central session remains active.
 * Global HomeCheff logout is a separate explicit action on Homecheff.
 */
export async function POST() {
  try {
    await clearSession();
  } catch (error) {
    return apiServiceUnavailable("auth/logout", error);
  }
  const res = NextResponse.json({ ok: true });
  applySkipSilentSsoCookie(res);
  return res;
}
