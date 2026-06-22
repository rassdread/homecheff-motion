import {
  authorizeStudioAction,
  captureStudioActionReservation,
  refundStudioActionReservation,
  type CreditReservation,
} from "@/server/studio-account/studio-credit-authorization";
import {
  PREMIUM_VISION_ANALYSIS_ACTION,
  PREMIUM_VISION_ANALYSIS_CREDITS,
  type PremiumVisionCreditSession,
} from "@/lib/editor-premium-vision-credits";
import { sumEditorPremiumProviderCostUsd } from "@/server/editor/editor-premium-provider-cost";
import type { SessionUser } from "@/server/auth/session";

export async function authorizePremiumVisionAnalysis(input: {
  user: Pick<SessionUser, "id" | "email" | "role">;
  projectId?: string | null;
  sessionId?: string | null;
  analysisId?: string | null;
  analysisRunId?: string | null;
  assetId?: string | null;
}): Promise<
  | { ok: true; session: PremiumVisionCreditSession }
  | { ok: false; code: string; message: string; requiredCredits: number }
> {
  const startedAt = new Date().toISOString();
  const auth = await authorizeStudioAction({
    user: input.user,
    actionType: PREMIUM_VISION_ANALYSIS_ACTION,
    projectId: input.projectId ?? undefined,
    confirmed: true,
    metadataJson: {
      feature: "editor_premium_vision_analysis",
      sessionId: input.sessionId ?? null,
      analysisId: input.analysisId ?? null,
      analysisRunId: input.analysisRunId ?? null,
      assetId: input.assetId ?? null,
    },
  });

  if (!auth.ok) {
    return {
      ok: false,
      code: auth.code,
      message: auth.message,
      requiredCredits: auth.preview.requiredCredits,
    };
  }

  const creditsCharged = auth.adminBypass ? 0 : auth.reservation.requiredCredits;
  const creditStatus = auth.adminBypass ? "admin_free" : "pending";

  return {
    ok: true,
    session: {
      adminBypass: Boolean(auth.adminBypass),
      reservation: auth.reservation,
      creditsCharged,
      creditStatus,
      startedAt,
      sessionId: input.sessionId ?? null,
      analysisId: input.analysisId ?? null,
      analysisRunId: input.analysisRunId ?? null,
      projectId: input.projectId ?? null,
      assetId: input.assetId ?? null,
    },
  };
}

export async function capturePremiumVisionAnalysis(input: {
  userId: string;
  session: PremiumVisionCreditSession;
}): Promise<PremiumVisionCreditSession> {
  const costs = await sumEditorPremiumProviderCostUsd({
    analysisRunId: input.session.analysisRunId,
    sessionId: input.session.sessionId,
    analysisId: input.session.analysisId,
  });

  if (!input.session.adminBypass) {
    await captureStudioActionReservation({
      userId: input.userId,
      reservation: input.session.reservation,
      projectId: input.session.projectId ?? undefined,
      providerCostUsd: costs.estimateUsd,
      metadataJson: {
        feature: "editor_premium_vision_analysis",
        sessionId: input.session.sessionId,
        analysisId: input.session.analysisId,
        analysisRunId: input.session.analysisRunId,
        assetId: input.session.assetId,
        providerCostEstimateUsd: costs.estimateUsd,
        providerCostActualUsd: costs.actualUsd,
      },
    });
  }

  return {
    ...input.session,
    creditsCharged: input.session.adminBypass ? 0 : input.session.reservation.requiredCredits,
    creditStatus: input.session.adminBypass ? "admin_free" : "charged",
  };
}

export async function refundPremiumVisionAnalysis(input: {
  userId: string;
  session: PremiumVisionCreditSession;
  failedGeneration?: boolean;
}): Promise<PremiumVisionCreditSession> {
  if (input.session.adminBypass) {
    return { ...input.session, creditsCharged: 0, creditStatus: "admin_free" };
  }

  await refundStudioActionReservation({
    userId: input.userId,
    reservation: input.session.reservation,
    projectId: input.session.projectId ?? undefined,
    failedGeneration: input.failedGeneration ?? true,
    metadataJson: {
      feature: "editor_premium_vision_analysis",
      sessionId: input.session.sessionId,
      analysisId: input.session.analysisId,
      analysisRunId: input.session.analysisRunId,
      assetId: input.session.assetId,
      refundReason: "premium_analysis_failed",
    },
  });

  return {
    ...input.session,
    creditsCharged: 0,
    creditStatus: "refunded",
  };
}

export function serializeCreditReservation(
  reservation: CreditReservation
): CreditReservation {
  return {
    reservationId: reservation.reservationId,
    requiredCredits: reservation.requiredCredits,
    service: reservation.service,
    provider: reservation.provider,
    reservedCostUsd: reservation.reservedCostUsd,
    marginEstimate: reservation.marginEstimate,
  };
}

export { PREMIUM_VISION_ANALYSIS_CREDITS };
