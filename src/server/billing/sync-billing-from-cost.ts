/**
 * Create CustomerBillingEvent from a completed ProviderCostEvent.
 */

import { prisma } from "@/lib/prisma";
import { createCustomerBillingEvent } from "@/server/billing/customer-billing-events";
import type { VideoRenderType } from "@/server/billing/video-pricing-config";
import {
  COST_ACTION,
  INSTRUMENTATION_ONLY_ACTIONS,
} from "@/server/provider-cost/cost-event-types";

function mapRenderType(
  actionType: string,
  metadata: Record<string, unknown> | null
): VideoRenderType {
  const rt = metadata?.renderType;
  if (typeof rt === "string") {
    if (rt === "full_rerender") {
      return "full_rerender";
    }
    if (rt === "story_mode" || rt.includes("story")) {
      return "story_mode";
    }
    if (rt === "text_rerender") {
      return "text_rerender";
    }
    if (rt === "language_export") {
      return "language_export";
    }
  }
  if (actionType === COST_ACTION.TEXT_RERENDER) {
    return "text_rerender";
  }
  if (actionType === COST_ACTION.LANGUAGE_EXPORT) {
    return "language_export";
  }
  if (actionType === COST_ACTION.VIDEO_EXPORT) {
    return "full_export";
  }
  return "transition_mode";
}

function creditsFromCostEvent(event: {
  unitsUsed: number | null;
  unitType: string;
  internalCostUsd: number | null;
  totalCostUsd: number | null;
}): number {
  if (event.unitType === "credits" && event.unitsUsed != null) {
    return Math.round(event.unitsUsed);
  }
  const cost = event.internalCostUsd ?? event.totalCostUsd ?? 0;
  return Math.round(cost / 0.005);
}

export async function syncCustomerBillingFromCostEvent(
  costEventId: string
): Promise<void> {
  const event = await prisma.providerCostEvent.findUnique({
    where: { id: costEventId },
    include: { user: { select: { role: true } } },
  });

  if (!event?.userId) {
    return;
  }

  if (INSTRUMENTATION_ONLY_ACTIONS.has(event.actionType as (typeof COST_ACTION)[keyof typeof COST_ACTION])) {
    return;
  }

  const meta = (event.metadataJson as Record<string, unknown> | null) ?? {};
  const walletBilled =
    meta.studioWalletBilling === true || meta.studioWalletCaptured === true;

  const terminal = ["completed", "failed", "cancelled"];
  if (!terminal.includes(event.status)) {
    return;
  }

  const creditsUsed = creditsFromCostEvent(event);
  const internalCostUsd = event.internalCostUsd ?? event.totalCostUsd ?? undefined;
  const instantMode = typeof meta.instantMode === "string" ? meta.instantMode : undefined;

  await createCustomerBillingEvent({
    userId: event.userId,
    projectId: event.projectId,
    providerCostEventId: event.id,
    actionType: event.actionType,
    renderType: mapRenderType(event.actionType, meta),
    creditsUsed,
    internalCostUsd: internalCostUsd ?? undefined,
    status: event.status === "completed" ? "completed" : event.status,
    user: { role: event.user?.role ?? "user" },
    isEstimated: event.isEstimated,
    underlyingInstantMode: instantMode === "story" ? "story" : instantMode === "transition" ? "transition" : undefined,
    metadataJson: {
      provider: event.provider,
      providerJobId: event.providerJobId,
      unitsUsed: event.unitsUsed,
      unitType: event.unitType,
      analyticsOnly: walletBilled,
      billingSource: walletBilled ? "studio_wallet" : "legacy",
    },
  });
}
