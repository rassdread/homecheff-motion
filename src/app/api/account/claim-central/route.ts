/**
 * SP.2B.3 — finalize dual-proof claim after user confirms identity on Studio.
 */

import { NextResponse } from "next/server";
import { claimExistingStudioUser } from "@/lib/identity/sso/claim-user";
import {
  STUDIO_CLAIM_PENDING_COOKIE,
  clearClaimPendingCookie,
  decodeClaimPending,
} from "@/lib/identity/sso/claim-pending";
import { StudioSsoError } from "@/lib/identity/sso/errors";
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

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") ?? "";
  const raw = header
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    const action = (body.action ?? "confirm").trim().toLowerCase();

    if (action === "cancel") {
      logStudioSsoEvent("claim_cancelled", { phase: "user" });
      const res = NextResponse.json({ ok: true, cancelled: true });
      clearClaimPendingCookie(res);
      return res;
    }

    const pending = decodeClaimPending(readCookie(req, STUDIO_CLAIM_PENDING_COOKIE));
    const sessionUser = await getAuthenticatedUser();
    if (!sessionUser || sessionUser.id !== pending.claimStudioUserId) {
      throw new StudioSsoError("CLAIM_UNAUTHORIZED");
    }

    const claimed = await claimExistingStudioUser({
      studioUserId: pending.claimStudioUserId,
      centralUserId: pending.centralUserId,
      claimMethod: "dual_proof_legacy_session",
    });

    logStudioSsoEvent("claim_identity_confirmed", {
      phase: "finalized",
      studioUserIdPrefix: claimed.id.slice(0, 8),
      centralUserIdPrefix: claimed.centralUserId.slice(0, 8),
    });

    const res = NextResponse.json({
      ok: true,
      returnTo: pending.returnTo,
      alreadyLinked: claimed.alreadyLinked,
    });
    clearClaimPendingCookie(res);
    applyStudioSessionToResponse(res, claimed.id);
    return res;
  } catch (err) {
    const code = err instanceof StudioSsoError ? err.code : "INTERNAL_ERROR";
    logStudioSsoEvent("sso_failure", { phase: "claim_finalize", code });
    const res = NextResponse.json({ ok: false, code }, { status: 400 });
    if (code === "SSO_EXPIRED" || code === "CLAIM_UNAUTHORIZED") {
      clearClaimPendingCookie(res);
    }
    return res;
  }
}

export async function GET(req: Request) {
  // Convenience: redirect browsers that hit GET back to confirm UI.
  return NextResponse.redirect(new URL("/account/claim/confirm", appOrigin(req)), 302);
}
