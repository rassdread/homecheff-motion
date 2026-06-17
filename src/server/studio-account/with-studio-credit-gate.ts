import { NextResponse } from "next/server";
import { billProviderAction, type ProviderCostSpec } from "@/server/studio-account/bill-provider-action";
import {
  authorizeStudioAction,
  type CreditReservation,
} from "@/server/studio-account/studio-credit-authorization";
import type { StudioActionType } from "@/server/studio-account/studio-action-cost-registry";
import type { SessionUser } from "@/server/auth/session";

export type CreditGatedExecution<T> = {
  result: T;
  reservation: CreditReservation;
  adminBypass?: boolean;
};

/**
 * Authorize credits before provider call. Returns NextResponse if blocked.
 */
export async function requireStudioCredits(input: {
  user: Pick<SessionUser, "id" | "email" | "role">;
  actionType: StudioActionType | string;
  projectId?: string;
  confirmed?: boolean;
  overrideCredits?: number;
}): Promise<
  | { blocked: NextResponse }
  | { authorized: true; reservation: CreditReservation; adminBypass?: boolean }
> {
  const auth = await authorizeStudioAction(input);
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
  return {
    authorized: true,
    reservation: auth.reservation,
    adminBypass: auth.adminBypass,
  };
}

/**
 * Execute provider action with unified billing: PCE + wallet + ledger.
 */
export async function withStudioCreditGate<T>(input: {
  user: Pick<SessionUser, "id" | "email" | "role">;
  actionType: StudioActionType | string;
  projectId?: string;
  confirmed?: boolean;
  overrideCredits?: number;
  providerCostUsd?: number;
  relatedJobId?: string;
  execute: () => Promise<T>;
  isFailure?: (result: T) => boolean;
  buildCostEvent?: (result: T) => ProviderCostSpec | null | Promise<ProviderCostSpec | null>;
}): Promise<{ blocked: NextResponse } | { ok: true; result: T; estimatedCredits?: number }> {
  const billed = await billProviderAction({
    user: input.user,
    actionType: input.actionType,
    projectId: input.projectId,
    confirmed: input.confirmed,
    overrideCredits: input.overrideCredits,
    relatedJobId: input.relatedJobId,
    execute: input.execute,
    isFailure: input.isFailure,
    buildCostEvent: input.buildCostEvent,
  });

  if ("blocked" in billed) {
    return { blocked: billed.blocked };
  }

  return {
    ok: true,
    result: billed.result,
    estimatedCredits: billed.billing.estimatedCredits,
  };
}

export function mapAssetKindToActionType(kind: string): StudioActionType {
  switch (kind) {
    case "character":
      return "character_generation";
    case "location":
      return "location_generation";
    case "prop":
      return "prop_generation";
    default:
      return "scene_generation";
  }
}

export function mapPublishFormatToActionType(format: string): StudioActionType {
  switch (format) {
    case "photo_story":
      return "publish_photo_story";
    case "slideshow":
      return "publish_slideshow";
    case "voice_message":
      return "publish_voice_message";
    case "poster":
      return "publish_poster_export";
    default:
      return "publish_mp4_export";
  }
}

/** Attach estimatedCredits to JSON responses from billed routes. */
export function withEstimatedCredits<T extends Record<string, unknown>>(
  body: T,
  estimatedCredits?: number
): T & { estimatedCredits?: number } {
  if (estimatedCredits == null) {
    return body;
  }
  return { ...body, estimatedCredits };
}
