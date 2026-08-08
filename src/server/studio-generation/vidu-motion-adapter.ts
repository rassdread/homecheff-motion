/**
 * SERVER_ONLY — Vidu / Motion long-running adapter boundary (S.4E).
 *
 * Does not call Vidu SDK directly; wraps existing animation-jobs service.
 * Cancellation is unsupported after provider acceptance (honest contract).
 */

import {
  pollProjectJobs,
  startProjectJobs,
} from "@/server/animation-jobs/service";
import { prisma } from "@/lib/prisma";
import { mapLegacyStatusToStudioGeneration } from "@/lib/studio-generation-status";
import type {
  StudioGenerationProviderAdapter,
  StudioProviderResult,
  StudioProviderStartInput,
  StudioProviderStartResult,
  StudioProviderStatusResult,
} from "@/server/studio-generation/provider-adapter";

export function createViduMotionAdapter(): StudioGenerationProviderAdapter {
  return {
    id: "vidu_motion",
    supportsAsync: true,
    supportsCancellation: false,
    async start(input: StudioProviderStartInput): Promise<StudioProviderStartResult> {
      const animationProjectId =
        typeof input.payload.animationProjectId === "string" ?
          input.payload.animationProjectId
        : "";
      if (!animationProjectId) {
        throw new Error("INVALID_INPUT: animationProjectId required");
      }
      await startProjectJobs(animationProjectId);
      const transitions = await prisma.animationTransition.findMany({
        where: { projectId: animationProjectId },
        select: { id: true, providerJobId: true, status: true },
        orderBy: { order: "asc" },
      });
      const providerJobIds = transitions
        .map((t) => t.providerJobId?.trim())
        .filter((id): id is string => Boolean(id));
      return {
        providerJobId: providerJobIds[0] ?? `motion_project:${animationProjectId}`,
        syncResult: {
          metadata: {
            animationProjectId,
            transitionIds: transitions.map((t) => t.id),
            providerJobIds,
          },
        },
      };
    },
    async getStatus(providerJobId: string): Promise<StudioProviderStatusResult> {
      const animationProjectId = await resolveAnimationProjectId(providerJobId);
      if (!animationProjectId) {
        return {
          providerStatus: "unknown",
          studioStatus: "failed",
          errorCode: "PROVIDER_UNAVAILABLE",
          errorMessageSafe: "Motion project not found for generation job.",
        };
      }
      await pollProjectJobs(animationProjectId);
      const project = await prisma.animationProject.findUnique({
        where: { id: animationProjectId },
        select: { status: true },
      });
      const providerStatus = project?.status ?? "unknown";
      const mapped = mapMotionProjectStatus(providerStatus);
      return {
        providerStatus,
        studioStatus: mapped,
        progress: null,
        errorCode: mapped === "failed" ? "PROVIDER_REJECTED" : undefined,
        errorMessageSafe:
          mapped === "failed" ? "Motion generation failed." : undefined,
      };
    },
    async getResult(providerJobId: string): Promise<StudioProviderResult> {
      const animationProjectId = await resolveAnimationProjectId(providerJobId);
      if (!animationProjectId) {
        return { metadata: { missing: true } };
      }
      const project = await prisma.animationProject.findUnique({
        where: { id: animationProjectId },
        select: {
          id: true,
          status: true,
          transitions: {
            select: { outputVideoUrl: true, status: true },
            orderBy: { order: "asc" },
          },
        },
      });
      const firstOutput =
        project?.transitions.find((t) => t.outputVideoUrl?.trim())?.outputVideoUrl ?? undefined;
      return {
        outputAssetId: firstOutput,
        externalUrl: firstOutput,
        metadata: {
          animationProjectId,
          projectStatus: project?.status,
        },
      };
    },
  };
}

function mapMotionProjectStatus(
  status: string
): StudioProviderStatusResult["studioStatus"] {
  const normalized = status.trim().toLowerCase();
  if (normalized === "completed" || normalized === "ready") {
    return "succeeded";
  }
  /** Segments done; final assembly still running — not terminal success yet. */
  if (normalized === "rendering") {
    return "processing";
  }
  if (normalized === "failed" || normalized.startsWith("failed")) {
    return "failed";
  }
  return mapLegacyStatusToStudioGeneration(normalized) as StudioProviderStatusResult["studioStatus"];
}

async function resolveAnimationProjectId(providerJobId: string): Promise<string | null> {
  if (providerJobId.startsWith("motion_project:")) {
    return providerJobId.slice("motion_project:".length) || null;
  }
  const transition = await prisma.animationTransition.findFirst({
    where: { providerJobId },
    select: { projectId: true },
  });
  return transition?.projectId ?? null;
}
