/**
 * Persist Studio first-touch acquisition + activation (deduped, never overwrite).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  hasStudioUtmSignal,
  type StudioUtmCapture,
} from "@/lib/acquisition/utm-persistence";

export const STUDIO_ACTIVATION_KIND_EXPORT = "animation_export";
export const STUDIO_ACTIVATION_KIND_RENDER_VERSION = "project_render_version";

export type StudioActivationKind =
  | typeof STUDIO_ACTIVATION_KIND_EXPORT
  | typeof STUDIO_ACTIVATION_KIND_RENDER_VERSION;

/**
 * Upsert first-touch once on StudioAccount. Never overwrites an existing capture.
 */
export async function upsertStudioAcquisitionFirstTouch(
  userId: string,
  capture: StudioUtmCapture | null | undefined,
): Promise<boolean> {
  if (!hasStudioUtmSignal(capture) || !capture) return false;

  const account = await prisma.studioAccount.findUnique({
    where: { userId },
    select: { id: true, acquisitionFirstTouch: true },
  });
  if (!account) return false;
  if (account.acquisitionFirstTouch != null) return false;

  const updated = await prisma.studioAccount.updateMany({
    where: { userId, acquisitionFirstTouch: { equals: Prisma.DbNull } },
    data: {
      acquisitionFirstTouch: capture as unknown as Prisma.InputJsonValue,
    },
  });
  // Some drivers treat missing Json as null without DbNull filter match — fallback once.
  if (updated.count === 0) {
    const again = await prisma.studioAccount.findUnique({
      where: { userId },
      select: { acquisitionFirstTouch: true },
    });
    if (again?.acquisitionFirstTouch != null) return false;
    await prisma.studioAccount.update({
      where: { userId },
      data: {
        acquisitionFirstTouch: capture as unknown as Prisma.InputJsonValue,
      },
    });
    return true;
  }
  return true;
}

/**
 * STUDIO_ACTIVATED = first successful AnimationExport or ProjectRenderVersion completed.
 * Sets acquisitionActivatedAt once (never overwrite).
 */
export async function recordStudioAcquisitionActivation(
  userId: string,
  kind: StudioActivationKind,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const updated = await prisma.studioAccount.updateMany({
      where: { userId, acquisitionActivatedAt: null },
      data: {
        acquisitionActivatedAt: new Date(),
        acquisitionActivationKind: kind,
      },
    });
    return updated.count > 0;
  } catch (err) {
    console.error("[studio-acquisition] activation record failed", err);
    return false;
  }
}

/** Resolve owner and record activation for a completed AnimationExport project. */
export async function recordStudioAcquisitionActivationForProject(
  projectId: string,
  kind: StudioActivationKind = STUDIO_ACTIVATION_KIND_EXPORT,
): Promise<void> {
  try {
    const project = await prisma.animationProject.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });
    if (!project?.ownerId) return;
    await recordStudioAcquisitionActivation(project.ownerId, kind);
  } catch (err) {
    console.error("[studio-acquisition] project activation failed", err);
  }
}
