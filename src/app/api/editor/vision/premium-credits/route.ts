import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  authorizePremiumVisionAnalysis,
  capturePremiumVisionAnalysis,
  refundPremiumVisionAnalysis,
  serializeCreditReservation,
} from "@/server/editor/editor-premium-vision-billing";
import type { PremiumVisionCreditSession } from "@/lib/editor-premium-vision-credits";
import { PREMIUM_VISION_ANALYSIS_CREDITS } from "@/lib/editor-premium-vision-credits";

export const runtime = "nodejs";

type RequestBody = {
  action?: "authorize" | "capture" | "refund";
  projectId?: string | null;
  sessionId?: string | null;
  analysisId?: string | null;
  analysisRunId?: string | null;
  assetId?: string | null;
  session?: PremiumVisionCreditSession;
  failedGeneration?: boolean;
};

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = body.action ?? "authorize";

  if (action === "authorize") {
    const result = await authorizePremiumVisionAnalysis({
      user,
      projectId: body.projectId,
      sessionId: body.sessionId,
      analysisId: body.analysisId,
      analysisRunId: body.analysisRunId,
      assetId: body.assetId,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: result.code,
          message: result.message,
          requiredCredits: result.requiredCredits,
        },
        { status: result.code === "insufficient_credits" ? 402 : 403 }
      );
    }
    return NextResponse.json({
      ok: true,
      adminBypass: result.session.adminBypass,
      requiredCredits: result.session.adminBypass
        ? 0
        : result.session.reservation.requiredCredits,
      reservation: serializeCreditReservation(result.session.reservation),
      session: result.session,
    });
  }

  if (!body.session?.reservation) {
    return NextResponse.json({ error: "session is required." }, { status: 400 });
  }

  if (action === "capture") {
    const updated = await capturePremiumVisionAnalysis({
      userId: user.id,
      session: body.session,
    });
    return NextResponse.json({ ok: true, session: updated });
  }

  if (action === "refund") {
    const updated = await refundPremiumVisionAnalysis({
      userId: user.id,
      session: body.session,
      failedGeneration: body.failedGeneration ?? true,
    });
    return NextResponse.json({ ok: true, session: updated });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    actionType: "premium_vision_analysis",
    credits: PREMIUM_VISION_ANALYSIS_CREDITS,
  });
}
