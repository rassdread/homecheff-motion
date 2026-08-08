/**
 * Unified Studio billing pipeline — reserve → execute → ProviderCostEvent → capture → ledger link.
 */

import { NextResponse } from "next/server";
import {
  authorizeStudioAction,
  captureStudioActionReservation,
  previewStudioCreditAuthorization,
  refundStudioActionReservation,
  type CreditReservation,
} from "@/server/studio-account/studio-credit-authorization";
import type { StudioActionType } from "@/server/studio-account/studio-action-cost-registry";
import {
  defaultProviderCostSpec,
  providerCostUsdFromSpec,
  type ProviderCostSpec,
} from "@/server/studio-account/studio-action-cost-mapping";
import { recordCostEventLinked } from "@/server/provider-cost/provider-cost-event";
import { validateProductionTransactionForAction } from "@/server/studio/production-transaction-validator";
import type { SessionUser } from "@/server/auth/session";
import type { CostActionType } from "@/server/provider-cost/cost-event-types";
import { prisma } from "@/lib/prisma";

export type { ProviderCostSpec };

export type BillProviderActionResult = {
  estimatedCredits: number;
  providerCostEventId: string | null;
  captured: boolean;
  adminBypass?: boolean;
  productionChain?: boolean;
};

export type BillProviderActionSuccess<T> = {
  ok: true;
  result: T;
  billing: BillProviderActionResult;
};

async function resolveCostSpec<T>(
  input: {
    actionType: StudioActionType | string;
    userId: string;
    projectId?: string;
    overrideUnits?: number;
    relatedJobId?: string;
    failed: boolean;
  },
  result: T,
  buildCostEvent?: (result: T) => ProviderCostSpec | null | Promise<ProviderCostSpec | null>
): Promise<ProviderCostSpec | null> {
  if (buildCostEvent) {
    const custom = await buildCostEvent(result);
    if (custom) {
      return { ...custom, status: input.failed ? "failed" : custom.status ?? "completed" };
    }
  }
  return defaultProviderCostSpec({
    actionType: input.actionType,
    userId: input.userId,
    projectId: input.projectId,
    status: input.failed ? "failed" : "completed",
    relatedJobId: input.relatedJobId,
    unitsUsed: input.overrideUnits,
  });
}

/**
 * ProviderCostEvent.projectId FK → AnimationProject only.
 * Studio storyboard/session ids must not be written as projectId.
 */
async function resolveAnimationProjectIdForCostEvent(
  projectId?: string | null
): Promise<string | null> {
  if (!projectId?.trim()) {
    return null;
  }
  const row = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function writeProviderCostEvent(spec: ProviderCostSpec | null): Promise<string | null> {
  if (!spec) {
    return null;
  }
  const animationProjectId = await resolveAnimationProjectIdForCostEvent(spec.projectId);
  try {
    return await recordCostEventLinked({
      provider: spec.provider,
      actionType: spec.costActionType as CostActionType,
      projectId: animationProjectId,
      userId: spec.userId,
      relatedJobId: spec.relatedJobId,
      relatedExportId: spec.relatedExportId,
      status: spec.status ?? "completed",
      unitType: spec.unitType,
      unitsUsed: spec.unitsUsed,
      unitCostUsd: spec.unitCostUsd,
      isEstimated: spec.isEstimated ?? true,
      estimateReason: spec.estimateReason ?? "bill_provider_action",
      metadataJson: {
        ...spec.metadataJson,
        studioWalletCaptured: true,
        ...(spec.projectId && !animationProjectId
          ? { studioProjectRef: spec.projectId, studioProjectRefKind: "non_animation_project" }
          : {}),
      },
    });
  } catch (error) {
    /** Cost telemetry must not fail a successful billed generation. */
    console.error("provider_cost_event_write_failed", {
      actionType: spec.costActionType,
      projectId: spec.projectId,
      animationProjectId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

/**
 * Single billing flow for all paid provider actions.
 */
export async function billProviderAction<T>(input: {
  user: Pick<SessionUser, "id" | "email" | "role">;
  actionType: StudioActionType | string;
  projectId?: string;
  confirmed?: boolean;
  overrideCredits?: number;
  productionTransactionId?: string;
  productionReservationId?: string;
  hcProjectId?: string;
  relatedJobId?: string;
  execute: () => Promise<T>;
  isFailure?: (result: T) => boolean;
  /** When true, refund reservation (e.g. library cache hit — no provider cost). */
  skipCapture?: (result: T) => boolean;
  buildCostEvent?: (result: T) => ProviderCostSpec | null | Promise<ProviderCostSpec | null>;
}): Promise<{ blocked: NextResponse } | BillProviderActionSuccess<T>> {
  if (input.productionTransactionId) {
    const validation = await validateProductionTransactionForAction({
      userId: input.user.id,
      hcProjectId: input.hcProjectId,
      productionTransactionId: input.productionTransactionId,
      actionType: input.actionType,
    });

    if (!validation.ok) {
      return {
        blocked: NextResponse.json(
          {
            error: validation.message,
            code: validation.code,
            creditGate: true,
          },
          { status: 403 }
        ),
      };
    }

    const result = await input.execute();
    const failed = input.isFailure?.(result) ?? false;
    const costSpec = failed
      ? null
      : await resolveCostSpec(
          {
            actionType: input.actionType,
            userId: input.user.id,
            projectId: input.hcProjectId ?? validation.hcProjectId,
            relatedJobId: input.relatedJobId,
            failed,
          },
          result,
          input.buildCostEvent
        );
    const providerCostEventId = await writeProviderCostEvent(costSpec);

    return {
      ok: true,
      result,
      billing: {
        estimatedCredits: 0,
        providerCostEventId,
        captured: false,
        adminBypass: false,
        productionChain: true,
      },
    };
  }

  if (input.productionReservationId) {
    const result = await input.execute();
    return {
      ok: true,
      result,
      billing: {
        estimatedCredits: 0,
        providerCostEventId: null,
        captured: false,
        adminBypass: true,
      },
    };
  }

  const preview = await previewStudioCreditAuthorization({
    user: input.user,
    actionType: input.actionType,
    projectId: input.projectId,
    overrideCredits: input.overrideCredits,
  });

  const auth = await authorizeStudioAction({
    user: input.user,
    actionType: input.actionType,
    projectId: input.projectId,
    confirmed: input.confirmed,
    overrideCredits: input.overrideCredits,
  });

  if (!auth.ok) {
    return {
      blocked: NextResponse.json(
        {
          error: auth.message,
          code: auth.code,
          creditGate: true,
          preview: auth.preview,
          estimatedCredits: auth.preview.requiredCredits,
        },
        { status: auth.code === "confirmation_required" ? 402 : 403 }
      ),
    };
  }

  const reservation = auth.reservation;
  const adminBypass = auth.adminBypass;

  try {
    const result = await input.execute();
    const failed = input.isFailure?.(result) ?? false;
    const skipCapture = !failed && (input.skipCapture?.(result) ?? false);

    const costSpec =
      skipCapture
        ? null
        : await resolveCostSpec(
            {
              actionType: input.actionType,
              userId: input.user.id,
              projectId: input.projectId,
              relatedJobId: input.relatedJobId,
              failed,
            },
            result,
            input.buildCostEvent
          );

    const providerCostEventId = skipCapture ? null : await writeProviderCostEvent(costSpec);
    const providerCostUsd = costSpec ? providerCostUsdFromSpec(costSpec) : undefined;

    if (failed || skipCapture) {
      if (!adminBypass) {
        await refundStudioActionReservation({
          userId: input.user.id,
          reservation,
          projectId: input.projectId,
          failedGeneration: failed,
          metadataJson: {
            providerCostEventId,
            skippedCapture: skipCapture,
          },
        });
      }
      return {
        ok: true,
        result,
        billing: {
          estimatedCredits: preview.requiredCredits,
          providerCostEventId,
          captured: false,
          adminBypass,
        },
      };
    }

    if (!adminBypass) {
      await captureStudioActionReservation({
        userId: input.user.id,
        reservation,
        projectId: input.projectId,
        providerCostUsd,
        providerCostEventId: providerCostEventId ?? undefined,
        metadataJson: {
          studioActionType: input.actionType,
        },
      });
    }

    return {
      ok: true,
      result,
      billing: {
        estimatedCredits: preview.requiredCredits,
        providerCostEventId,
        captured: !adminBypass && reservation.requiredCredits > 0,
        adminBypass,
      },
    };
  } catch (error) {
    const costSpec = await resolveCostSpec(
      {
        actionType: input.actionType,
        userId: input.user.id,
        projectId: input.projectId,
        relatedJobId: input.relatedJobId,
        failed: true,
      },
      undefined as T,
      undefined
    );
    const providerCostEventId = await writeProviderCostEvent(
      costSpec
        ? {
            ...costSpec,
            status: "failed",
            metadataJson: {
              ...costSpec.metadataJson,
              error: error instanceof Error ? error.message : "unknown",
            },
          }
        : null
    );

    if (!adminBypass) {
      await refundStudioActionReservation({
        userId: input.user.id,
        reservation,
        projectId: input.projectId,
        failedGeneration: true,
        metadataJson: {
          providerCostEventId,
          error: error instanceof Error ? error.message : "unknown",
        },
      });
    }
    throw error;
  }
}

/** Re-export for routes that only need authorization without execute wrapper. */
export type { CreditReservation };

export async function captureBilledProviderAction(input: {
  userId: string;
  reservation: CreditReservation;
  actionType: string;
  projectId?: string;
  providerCostEventId?: string;
  providerCostUsd?: number;
  metadataJson?: Record<string, unknown>;
}): Promise<void> {
  if (input.reservation.reservationId === "admin-bypass") {
    return;
  }
  await captureStudioActionReservation({
    userId: input.userId,
    reservation: input.reservation,
    projectId: input.projectId,
    providerCostUsd: input.providerCostUsd,
    providerCostEventId: input.providerCostEventId,
    metadataJson: {
      studioActionType: input.actionType,
      ...input.metadataJson,
    },
  });
}
