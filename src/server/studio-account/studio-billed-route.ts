/**
 * Shared helpers for API routes using billProviderAction.
 */

import { NextResponse } from "next/server";
import { billProviderAction, type ProviderCostSpec } from "@/server/studio-account/bill-provider-action";
import { withEstimatedCredits } from "@/server/studio-account/with-studio-credit-gate";
import type { StudioActionType } from "@/server/studio-account/studio-action-cost-registry";
import type { SessionUser } from "@/server/auth/session";

export async function runBilledProviderRoute<T>(input: {
  user: Pick<SessionUser, "id" | "email" | "role">;
  actionType: StudioActionType | string;
  projectId?: string;
  confirmed?: boolean;
  overrideCredits?: number;
  relatedJobId?: string;
  execute: () => Promise<T>;
  isFailure?: (result: T) => boolean;
  skipCapture?: (result: T) => boolean;
  buildCostEvent?: (result: T) => ProviderCostSpec | null | Promise<ProviderCostSpec | null>;
  onSuccess: (result: T, estimatedCredits?: number) => NextResponse;
}): Promise<NextResponse> {
  const billed = await billProviderAction({
    user: input.user,
    actionType: input.actionType,
    projectId: input.projectId,
    confirmed: input.confirmed,
    overrideCredits: input.overrideCredits,
    relatedJobId: input.relatedJobId,
    execute: input.execute,
    isFailure: input.isFailure,
    skipCapture: input.skipCapture,
    buildCostEvent: input.buildCostEvent,
  });

  if ("blocked" in billed) {
    return billed.blocked;
  }

  return input.onSuccess(billed.result, billed.billing.estimatedCredits);
}

export { withEstimatedCredits };
