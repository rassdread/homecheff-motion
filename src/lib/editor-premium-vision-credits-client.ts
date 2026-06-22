import type {
  PremiumVisionCreditReservation,
  PremiumVisionCreditSession,
} from "@/lib/editor-premium-vision-credits";
import { PREMIUM_VISION_ANALYSIS_CREDITS } from "@/lib/editor-premium-vision-credits";

export type PremiumVisionCreditsApiAction = "authorize" | "capture" | "refund";

export type PremiumVisionCreditsAuthorizeResult =
  | {
      ok: true;
      adminBypass: boolean;
      requiredCredits: number;
      reservation: PremiumVisionCreditReservation;
      session: PremiumVisionCreditSession;
    }
  | {
      ok: false;
      code: string;
      message: string;
      requiredCredits: number;
    };

export async function authorizePremiumVisionCreditsClient(input: {
  projectId?: string | null;
  sessionId?: string | null;
  analysisId?: string | null;
  analysisRunId?: string | null;
  assetId?: string | null;
}): Promise<PremiumVisionCreditsAuthorizeResult> {
  const res = await fetch("/api/editor/vision/premium-credits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      action: "authorize",
      ...input,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as PremiumVisionCreditsAuthorizeResult & {
    error?: string;
  };
  if (!res.ok || !body.ok) {
    return {
      ok: false,
      code: "code" in body ? body.code : "authorization_failed",
      message: "message" in body ? body.message : body.error ?? "Authorization failed.",
      requiredCredits:
        "requiredCredits" in body ? body.requiredCredits : PREMIUM_VISION_ANALYSIS_CREDITS,
    };
  }
  return body;
}

export async function capturePremiumVisionCreditsClient(
  session: PremiumVisionCreditSession
): Promise<void> {
  await fetch("/api/editor/vision/premium-credits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "capture", session }),
  });
}

export async function refundPremiumVisionCreditsClient(
  session: PremiumVisionCreditSession
): Promise<void> {
  await fetch("/api/editor/vision/premium-credits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "refund", session, failedGeneration: true }),
  });
}
