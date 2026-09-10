/**
 * Motion (Vidu) credit settlement: capture only after all transitions succeed;
 * release if the project fails with no successful segments.
 *
 * Holds are stored on StudioGenerationJob so we do not need a schema migration.
 */

import { prisma } from "@/lib/prisma";
import type { CreditReservation } from "@/server/studio-account/studio-credit-authorization";
import {
  captureStudioActionReservation,
  refundStudioActionReservation,
} from "@/server/studio-account/studio-credit-authorization";

const MOTION_HOLD_CAPABILITY = "VIDEO_GENERATE";

export type MotionSettlementDecision = "captured" | "released" | "pending";

/** Capture only when every Vidu transition completed. Release only when every transition failed. Mixed/in-flight stays pending for reconciliation. */
export function decideMotionSettlement(
  transitions: Array<{ status: string }>,
): MotionSettlementDecision {
  if (transitions.length === 0) return "pending";
  if (transitions.every((t) => t.status === "completed")) return "captured";
  if (transitions.every((t) => t.status === "failed")) return "released";
  return "pending";
}

export async function attachMotionCreditHold(input: {
  userId: string;
  animationProjectId: string;
  reservation: CreditReservation;
  adminBypass?: boolean;
}): Promise<void> {
  if (input.adminBypass || input.reservation.reservationId === "admin-bypass") {
    return;
  }
  if (input.reservation.requiredCredits <= 0) {
    return;
  }

  const idempotencyKey = `motion-credit-hold:${input.animationProjectId}`;
  const existing = await prisma.studioGenerationJob.findUnique({
    where: { ownerId_idempotencyKey: { ownerId: input.userId, idempotencyKey } },
  });
  if (existing) {
    return;
  }

  try {
    await prisma.studioGenerationJob.create({
      data: {
        ownerId: input.userId,
        capability: MOTION_HOLD_CAPABILITY,
        actionType: "motion_render",
        status: "generating",
        executionMode: "async_poll",
        providerAdapter: "vidu_motion",
        idempotencyKey,
        creditCost: input.reservation.requiredCredits,
        creditsReserved: input.reservation.requiredCredits,
        creditsCharged: 0,
        creditReservationId: input.reservation.reservationId,
        chargeFinalized: false,
        metadataJson: {
          animationProjectId: input.animationProjectId,
          reservation: input.reservation,
          billing: "hold_until_provider_success",
        },
      },
    });
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (code === "P2002") return;
    throw error;
  }
}

export async function settleMotionCreditHold(animationProjectId: string): Promise<{
  settled: boolean;
  outcome: "captured" | "released" | "pending" | "already_final" | "no_hold";
}> {
  const job = await prisma.studioGenerationJob.findFirst({
    where: {
      capability: MOTION_HOLD_CAPABILITY,
      idempotencyKey: `motion-credit-hold:${animationProjectId}`,
    },
  });
  if (!job) {
    return { settled: false, outcome: "no_hold" };
  }
  if (job.chargeFinalized) {
    return { settled: true, outcome: "already_final" };
  }

  const transitions = await prisma.animationTransition.findMany({
    where: { projectId: animationProjectId },
    select: { status: true },
  });
  if (transitions.length === 0) {
    return { settled: false, outcome: "pending" };
  }

  const decision = decideMotionSettlement(transitions);
  const meta = (job.metadataJson ?? {}) as {
    reservation?: CreditReservation;
  };
  const reservation = meta.reservation;
  if (!reservation) {
    return { settled: false, outcome: "pending" };
  }

  if (decision === "captured") {
    await captureStudioActionReservation({
      userId: job.ownerId,
      reservation,
      projectId: animationProjectId,
      metadataJson: { motionSettlement: "provider_success" },
    });
    await prisma.studioGenerationJob.update({
      where: { id: job.id },
      data: {
        chargeFinalized: true,
        creditsCharged: job.creditsReserved,
        status: "succeeded",
        completedAt: new Date(),
      },
    });
    return { settled: true, outcome: "captured" };
  }

  if (decision === "released") {
    await refundStudioActionReservation({
      userId: job.ownerId,
      reservation,
      projectId: animationProjectId,
      failedGeneration: true,
      metadataJson: { motionSettlement: "provider_failure" },
    });
    await prisma.studioGenerationJob.update({
      where: { id: job.id },
      data: {
        chargeFinalized: true,
        creditsCharged: 0,
        status: "failed",
        failedAt: new Date(),
      },
    });
    return { settled: true, outcome: "released" };
  }

  return { settled: false, outcome: "pending" };
}
