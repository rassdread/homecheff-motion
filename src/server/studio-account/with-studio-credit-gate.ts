import { NextResponse } from "next/server";
import {
  authorizeStudioAction,
  captureStudioActionReservation,
  refundStudioActionReservation,
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
 * Execute provider action with automatic capture on success, refund on failure.
 */
export async function withStudioCreditGate<T>(input: {
  user: Pick<SessionUser, "id" | "email" | "role">;
  actionType: StudioActionType | string;
  projectId?: string;
  confirmed?: boolean;
  overrideCredits?: number;
  providerCostUsd?: number;
  execute: () => Promise<T>;
  isFailure?: (result: T) => boolean;
}): Promise<{ blocked: NextResponse } | { ok: true; result: T }> {
  const gate = await requireStudioCredits({
    user: input.user,
    actionType: input.actionType,
    projectId: input.projectId,
    confirmed: input.confirmed,
    overrideCredits: input.overrideCredits,
  });

  if ("blocked" in gate) {
    return { blocked: gate.blocked };
  }

  const { reservation } = gate;

  try {
    const result = await input.execute();
    const failed = input.isFailure?.(result) ?? false;

    if (failed) {
      await refundStudioActionReservation({
        userId: input.user.id,
        reservation,
        projectId: input.projectId,
        failedGeneration: true,
      });
    } else {
      await captureStudioActionReservation({
        userId: input.user.id,
        reservation,
        projectId: input.projectId,
        providerCostUsd: input.providerCostUsd,
      });
    }

    return { ok: true, result };
  } catch (error) {
    await refundStudioActionReservation({
      userId: input.user.id,
      reservation,
      projectId: input.projectId,
      failedGeneration: true,
      metadataJson: {
        error: error instanceof Error ? error.message : "unknown",
      },
    });
    throw error;
  }
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
