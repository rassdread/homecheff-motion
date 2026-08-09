import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  attemptAutoTopUpForInsufficientCredits,
  getAutoTopUpSettings,
  patchAutoTopUpSettings,
} from "@/server/studio-account/studio-auto-topup-service";
import { ensureStudioWallet } from "@/server/studio-account/studio-wallet-service";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const data = await getAutoTopUpSettings(user.id, user.email);
  return NextResponse.json({ ok: true, ...data });
}

export async function PATCH(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  let body: {
    enabled?: boolean;
    thresholdCredits?: number;
    topUpPackId?: string;
    consent?: boolean;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  try {
    const settings = await patchAutoTopUpSettings(user.id, user.email, body);
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    const code =
      message === "CONSENT_REQUIRED"
        ? "CONSENT_REQUIRED"
        : message === "INVALID_PACK"
          ? "INVALID_PACK"
          : "AUTO_TOPUP_UPDATE_FAILED";
    return NextResponse.json({ ok: false, code, error: message }, { status: 400 });
  }
}

/** Explicit attempt — never silent. Client calls when insufficient credits. */
export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  let body: { requiredCredits?: number; successUrl?: string; cancelUrl?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const wallet = await ensureStudioWallet(user.id);
  const requiredCredits =
    typeof body.requiredCredits === "number" && body.requiredCredits > 0
      ? Math.floor(body.requiredCredits)
      : 1;
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const successUrl =
    typeof body.successUrl === "string" && body.successUrl.trim()
      ? body.successUrl.trim()
      : `${origin}/account/billing?autoTopUp=success`;
  const cancelUrl =
    typeof body.cancelUrl === "string" && body.cancelUrl.trim()
      ? body.cancelUrl.trim()
      : `${origin}/account/billing?autoTopUp=cancel`;

  const result = await attemptAutoTopUpForInsufficientCredits({
    userId: user.id,
    email: user.email,
    requiredCredits,
    availableCredits: wallet.availableBalance,
    successUrl,
    cancelUrl,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 403 });
  }
  return NextResponse.json(result);
}
