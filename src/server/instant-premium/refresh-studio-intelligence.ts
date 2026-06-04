import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  compareHandoffsForRefreshAudit,
  detectStudioIntelligenceStaleness,
  summarizeStalenessReasons,
} from "@/lib/detect-studio-intelligence-staleness";
import {
  assertStudioJsonWithinSizeLimit,
  sanitizeMotionHandoffForStorage,
  STUDIO_HANDOFF_JSON_MAX_BYTES,
} from "@/lib/studio-motion-handoff-storage";
import {
  appendStudioRefreshAudit,
  buildStudioProjectImportFromHandoff,
  buildProjectStudioQaResponse,
  buildStoredStudioIntelligence,
} from "@/lib/studio-project-metadata";
import { getAnimationProjectByIdForViewer } from "@/server/animation-projects/queries";
import { createMotionHandoffPayload } from "@/server/studio/create-motion-handoff-payload";
import type {
  RefreshStudioIntelligenceOptions,
  RefreshStudioIntelligenceResult,
  StudioIntelligenceStalenessResult,
} from "@/types/studio-project-persistence";

const INTELLIGENCE_JSON_MAX_BYTES = 250_000;

export const REFRESH_STUDIO_NOT_FOUND = "REFRESH_STUDIO_NOT_FOUND";
export const REFRESH_STUDIO_FORBIDDEN = "REFRESH_STUDIO_FORBIDDEN";
export const REFRESH_STUDIO_NO_SOURCE = "REFRESH_STUDIO_NO_SOURCE";
export const REFRESH_STUDIO_STORYBOARD_GONE = "REFRESH_STUDIO_STORYBOARD_GONE";
export const REFRESH_STUDIO_NOT_IMPLEMENTED = "REFRESH_STUDIO_NOT_IMPLEMENTED";
export const REFRESH_STUDIO_PAYLOAD_TOO_LARGE = "REFRESH_STUDIO_PAYLOAD_TOO_LARGE";
export const REFRESH_STUDIO_INVALID_JSON = "REFRESH_STUDIO_INVALID_JSON";

export async function checkStudioIntelligenceStalenessForProject(params: {
  projectId: string;
  userId: string;
  isAdmin?: boolean;
  persistHint?: boolean;
}): Promise<
  | { ok: true; staleness: StudioIntelligenceStalenessResult; studioQa: ReturnType<typeof buildProjectStudioQaResponse> }
  | { ok: false; code: string; error: string; status: number }
> {
  const viewer = { id: params.userId, role: params.isAdmin ? "admin" : "user" };
  const project = await getAnimationProjectByIdForViewer(params.projectId, viewer);
  if (!project) {
    return {
      ok: false,
      code: REFRESH_STUDIO_NOT_FOUND,
      error: "Project not found.",
      status: 404,
    };
  }
  const storyboardId = project.studioSourceStoryboardId?.trim();
  if (!storyboardId) {
    return {
      ok: false,
      code: REFRESH_STUDIO_NO_SOURCE,
      error: "This project has no Studio storyboard source.",
      status: 400,
    };
  }

  const handoffResult = await createMotionHandoffPayload(storyboardId, viewer);
  if ("error" in handoffResult) {
    const status = handoffResult.error.httpStatus ?? 404;
    return {
      ok: false,
      code: status === 403 ? REFRESH_STUDIO_FORBIDDEN : REFRESH_STUDIO_STORYBOARD_GONE,
      error: handoffResult.error.message,
      status,
    };
  }

  const staleness = detectStudioIntelligenceStaleness({
    storedHandoff: project.studioHandoffJson,
    latestHandoff: handoffResult.payload,
    compareDriftLists: true,
  });

  if (params.persistHint && staleness.isStale) {
    const summary = summarizeStalenessReasons(staleness.reasons);
    await prisma.animationProject.update({
      where: { id: project.id },
      data: {
        studioLastStaleReason: summary || "Studio storyboard metadata differs from stored snapshot.",
      },
    });
  } else if (params.persistHint && !staleness.isStale) {
    await prisma.animationProject.update({
      where: { id: project.id },
      data: { studioLastStaleReason: null },
    });
  }

  const refreshed = await getAnimationProjectByIdForViewer(params.projectId, viewer);
  const studioQa = buildProjectStudioQaResponse({
    ...(refreshed ?? project),
    storyboardStale: staleness,
  });

  return { ok: true, staleness, studioQa };
}

export async function refreshStudioIntelligenceForAnimationProject(params: {
  projectId: string;
  userId: string;
  isAdmin?: boolean;
  options?: RefreshStudioIntelligenceOptions;
}): Promise<RefreshStudioIntelligenceResult> {
  const refreshQa = params.options?.refreshQa !== false;
  const refreshImages = params.options?.refreshImages === true;
  const refreshText = params.options?.refreshText === true;

  if (refreshImages || refreshText) {
    return {
      ok: false,
      code: REFRESH_STUDIO_NOT_IMPLEMENTED,
      error: "Refreshing images or text from Studio is not implemented yet. Use refreshQa only.",
      status: 501,
    };
  }
  if (!refreshQa) {
    return {
      ok: false,
      code: REFRESH_STUDIO_NOT_IMPLEMENTED,
      error: "At least refreshQa must be enabled.",
      status: 400,
    };
  }

  const viewer = { id: params.userId, role: params.isAdmin ? "admin" : "user" };
  const project = await getAnimationProjectByIdForViewer(params.projectId, viewer);
  if (!project) {
    return {
      ok: false,
      code: REFRESH_STUDIO_NOT_FOUND,
      error: "Project not found.",
      status: 404,
    };
  }

  const storyboardId = project.studioSourceStoryboardId?.trim();
  if (!storyboardId) {
    return {
      ok: false,
      code: REFRESH_STUDIO_NO_SOURCE,
      error: "This project has no Studio storyboard source to refresh from.",
      status: 400,
    };
  }

  const storedHandoff: unknown = project.studioHandoffJson;
  if (storedHandoff && typeof storedHandoff !== "object") {
    return {
      ok: false,
      code: REFRESH_STUDIO_INVALID_JSON,
      error: "Stored Studio handoff metadata is invalid.",
      status: 500,
    };
  }

  const handoffResult = await createMotionHandoffPayload(storyboardId, viewer);
  if ("error" in handoffResult) {
    const status = handoffResult.error.httpStatus ?? 404;
    return {
      ok: false,
      code: status === 403 ? REFRESH_STUDIO_FORBIDDEN : REFRESH_STUDIO_STORYBOARD_GONE,
      error: handoffResult.error.message,
      status,
    };
  }

  const missingImages = handoffResult.payload.scenes.filter(
    (s) => !s.selectedSceneImageUrl?.trim()
  ).length;
  if (missingImages > 0) {
    console.info("[studio-refresh] scenes missing selected images", {
      projectId: project.id,
      storyboardId,
      missingImages,
    });
  }

  const stalenessBefore = detectStudioIntelligenceStaleness({
    storedHandoff,
    latestHandoff: handoffResult.payload,
    compareDriftLists: true,
  });

  const importInput = buildStudioProjectImportFromHandoff(
    handoffResult.payload,
    project.studioSourceStoryboardTitle
  );
  const handoffSanitized = sanitizeMotionHandoffForStorage(handoffResult.payload);
  const handoffSize = assertStudioJsonWithinSizeLimit(
    "studioHandoff",
    handoffSanitized,
    STUDIO_HANDOFF_JSON_MAX_BYTES
  );
  if (!handoffSize.ok) {
    return {
      ok: false,
      code: REFRESH_STUDIO_PAYLOAD_TOO_LARGE,
      error: handoffSize.error,
      status: 400,
    };
  }

  const stored = buildStoredStudioIntelligence(
    importInput.intelligence,
    importInput.imageLineage ?? []
  );
  const intelSize = assertStudioJsonWithinSizeLimit(
    "studioIntelligence",
    stored,
    INTELLIGENCE_JSON_MAX_BYTES
  );
  if (!intelSize.ok) {
    return {
      ok: false,
      code: REFRESH_STUDIO_PAYLOAD_TOO_LARGE,
      error: intelSize.error,
      status: 400,
    };
  }

  const auditDiff = compareHandoffsForRefreshAudit(storedHandoff, handoffResult.payload);
  const refreshedAt = new Date();
  const auditEntry = {
    refreshedAt: refreshedAt.toISOString(),
    refreshedBy: params.userId,
    previousHandoffVersion: project.studioHandoffVersion,
    newHandoffVersion: handoffResult.payload.version,
    staleReasons: auditDiff.staleReasons,
    scoreChanges: auditDiff.scoreChanges,
    selectedImageChanges: auditDiff.selectedImageChanges,
  };

  const refreshAudit = appendStudioRefreshAudit(project.studioRefreshAuditJson, auditEntry);

  await prisma.animationProject.update({
    where: { id: project.id },
    data: {
      studioHandoffJson: handoffSanitized as Prisma.InputJsonValue,
      studioIntelligenceJson: stored as unknown as Prisma.InputJsonValue,
      studioSourceStoryboardTitle: importInput.storyboardTitle,
      studioHandoffVersion: handoffResult.payload.version,
      studioRefreshedAt: refreshedAt,
      studioIntelligenceStatus: "current",
      studioLastStaleReason: null,
      studioRefreshAuditJson: refreshAudit as unknown as Prisma.InputJsonValue,
    },
  });

  const updated = await getAnimationProjectByIdForViewer(params.projectId, viewer);
  const studioQa = buildProjectStudioQaResponse(updated ?? project);
  if (!studioQa) {
    return {
      ok: false,
      code: REFRESH_STUDIO_INVALID_JSON,
      error: "Failed to build Studio QA after refresh.",
      status: 500,
    };
  }

  return {
    ok: true,
    projectId: project.id,
    studioQa,
    audit: auditEntry,
    stalenessBefore,
  };
}
