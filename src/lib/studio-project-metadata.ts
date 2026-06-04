import type { Prisma } from "@prisma/client";
import { computeMotionRenderReadiness } from "@/lib/compute-motion-render-readiness";
import {
  assertStudioJsonWithinSizeLimit,
  sanitizeMotionHandoffForStorage,
  STUDIO_HANDOFF_JSON_MAX_BYTES,
} from "@/lib/studio-motion-handoff-storage";
import type { FullRerenderImageChangeAudit } from "@/lib/full-rerender-editor-types";
import type { PersistedWizardState } from "@/lib/instant-premium-wizard-storage";
import type { MotionStudioIntelligenceSnapshot } from "@/types/motion-studio-intelligence";
import { buildMotionStudioIntelligenceSnapshot } from "@/lib/build-motion-studio-intelligence";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type {
  ProjectStudioExportMetadata,
  ProjectStudioQaResponse,
  StoredStudioIntelligence,
  StudioImageLineageEntry,
  StudioIntelligenceStatus,
  StudioIntelligenceStalenessResult,
  StudioProjectImportInput,
  StudioRefreshAuditJson,
  StudioRefreshAuditEntry,
  StudioRenderAuditMetadata,
} from "@/types/studio-project-persistence";

const INTELLIGENCE_JSON_MAX_BYTES = 250_000;

export function buildStudioImageLineageFingerprint(lineage: StudioImageLineageEntry[]): string {
  return lineage
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(
      (row) =>
        `${row.order}:${row.sceneId}:${row.studioSceneImageId ?? ""}:${(row.previewUrl ?? "").slice(0, 120)}`
    )
    .join("|");
}

export function buildStudioImageLineageFromWizard(
  state: PersistedWizardState
): StudioImageLineageEntry[] {
  const slots = state.sceneSlots ?? [];
  return slots.map((slot, order) => ({
    order,
    sceneId: slot.sceneId,
    studioSceneImageId: slot.studioContext?.selectedSceneImageId ?? null,
    previewUrl:
      slot.image?.remoteWorkingUrl?.trim() ||
      slot.image?.remoteThumbnailUrl?.trim() ||
      null,
  }));
}

export function buildStudioImageLineageFromHandoff(
  payload: MotionHandoffPayload
): StudioImageLineageEntry[] {
  return [...payload.scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene, order) => ({
      order: scene.order ?? order,
      sceneId: scene.sceneId,
      studioSceneImageId: scene.selectedSceneImageId,
      previewUrl: scene.selectedSceneImageUrl?.trim() || null,
    }));
}

export function buildStudioProjectImportFromHandoff(
  payload: MotionHandoffPayload,
  storyboardTitle?: string | null
): StudioProjectImportInput {
  const intelligence = buildMotionStudioIntelligenceSnapshot(payload);
  return {
    storyboardId: payload.storyboardId,
    storyboardTitle: storyboardTitle?.trim() || payload.title,
    handoffVersion: payload.version,
    importedAt: new Date().toISOString(),
    intelligence,
    handoff: payload,
    imageLineage: buildStudioImageLineageFromHandoff(payload),
  };
}

export function appendStudioRefreshAudit(
  existing: unknown,
  entry: StudioRefreshAuditEntry
): StudioRefreshAuditJson {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as StudioRefreshAuditJson)
      : { events: [] };
  const events = Array.isArray(base.events) ? [...base.events, { ...entry, type: "studio_refresh" as const }] : [{ ...entry, type: "studio_refresh" as const }];
  return { events, lastRefresh: { ...entry, type: "studio_refresh" } };
}

export function appendStudioSyncAudit(
  existing: unknown,
  entry: import("@/types/studio-motion-sync").StudioSyncAuditEntry
): StudioRefreshAuditJson {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as StudioRefreshAuditJson)
      : { events: [] };
  const events = Array.isArray(base.events) ? [...base.events, entry] : [entry];
  return { ...base, events, lastSync: entry };
}

/** Persist Studio handoff + intelligence after sync/refresh (V20/V21). */
export function prismaStudioMetadataFromHandoff(
  handoff: import("@/types/motion-handoff-payload").MotionHandoffPayload,
  storyboardTitle: string | null
): Pick<
  Prisma.AnimationProjectUpdateInput,
  | "studioHandoffJson"
  | "studioIntelligenceJson"
  | "studioSourceStoryboardTitle"
  | "studioHandoffVersion"
  | "studioIntelligenceStatus"
  | "studioLastStaleReason"
> {
  const importInput = buildStudioProjectImportFromHandoff(handoff, storyboardTitle);
  const fields = studioMetadataPrismaFields(importInput);
  return {
    studioHandoffJson: fields.studioHandoffJson,
    studioIntelligenceJson: fields.studioIntelligenceJson,
    studioSourceStoryboardTitle: fields.studioSourceStoryboardTitle,
    studioHandoffVersion: fields.studioHandoffVersion,
    studioIntelligenceStatus: "current",
    studioLastStaleReason: null,
  };
}

export function buildStudioProjectImportFromWizard(
  state: PersistedWizardState
): StudioProjectImportInput | null {
  const handoff = state.studioHandoff;
  const intelligence = handoff?.intelligence;
  if (!handoff?.storyboardId?.trim() || !intelligence) {
    return null;
  }
  return {
    storyboardId: handoff.storyboardId.trim(),
    storyboardTitle: handoff.storyboardTitle?.trim() || intelligence.storyboardTitle,
    handoffVersion: handoff.handoffVersion ?? intelligence.handoffVersion,
    importedAt: handoff.importedAt ?? intelligence.importedAt,
    intelligence,
    imageLineage: buildStudioImageLineageFromWizard(state),
  };
}

function parseStoredIntelligence(raw: unknown): StoredStudioIntelligence | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as StoredStudioIntelligence;
  if (typeof row.storyboardId !== "string" || !Array.isArray(row.sceneBreakdowns)) {
    return null;
  }
  return row;
}

export function resolveStudioIntelligenceStatus(project: {
  studioIntelligenceStatus: string | null;
  studioIntelligenceJson: unknown;
}): StudioIntelligenceStatus {
  const stored = parseStoredIntelligence(project.studioIntelligenceJson);
  if (!stored) {
    return "missing";
  }
  const raw = project.studioIntelligenceStatus?.trim();
  if (raw === "stale" || raw === "current" || raw === "missing") {
    return raw;
  }
  return "current";
}

export function buildStoredStudioIntelligence(
  intelligence: MotionStudioIntelligenceSnapshot,
  imageLineage: StudioImageLineageEntry[]
): StoredStudioIntelligence {
  return {
    ...intelligence,
    imageLineage,
    imageLineageFingerprint: buildStudioImageLineageFingerprint(imageLineage),
  };
}

export function validateStudioProjectImport(
  raw: unknown
): { ok: true; data: StudioProjectImportInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "studioImport must be an object." };
  }
  const o = raw as Record<string, unknown>;
  const storyboardId = typeof o.storyboardId === "string" ? o.storyboardId.trim() : "";
  const storyboardTitle = typeof o.storyboardTitle === "string" ? o.storyboardTitle.trim() : "";
  if (!storyboardId) {
    return { ok: false, error: "studioImport.storyboardId is required." };
  }
  if (!storyboardTitle) {
    return { ok: false, error: "studioImport.storyboardTitle is required." };
  }
  const handoffVersion =
    typeof o.handoffVersion === "number" && Number.isFinite(o.handoffVersion)
      ? Math.floor(o.handoffVersion)
      : null;
  if (handoffVersion === null) {
    return { ok: false, error: "studioImport.handoffVersion is required." };
  }
  const intelligence = o.intelligence;
  if (!intelligence || typeof intelligence !== "object" || Array.isArray(intelligence)) {
    return { ok: false, error: "studioImport.intelligence is required." };
  }
  const intel = intelligence as MotionStudioIntelligenceSnapshot;
  if (intel.storyboardId !== storyboardId) {
    return { ok: false, error: "studioImport intelligence storyboardId mismatch." };
  }

  const imageLineage: StudioImageLineageEntry[] = [];
  if (Array.isArray(o.imageLineage)) {
    for (const entry of o.imageLineage) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        continue;
      }
      const row = entry as Record<string, unknown>;
      const sceneId = typeof row.sceneId === "string" ? row.sceneId.trim() : "";
      if (!sceneId) {
        continue;
      }
      imageLineage.push({
        order: typeof row.order === "number" ? row.order : imageLineage.length,
        sceneId,
        studioSceneImageId:
          typeof row.studioSceneImageId === "string" ? row.studioSceneImageId : null,
        previewUrl: typeof row.previewUrl === "string" ? row.previewUrl : null,
      });
    }
  }

  const stored = buildStoredStudioIntelligence(intel, imageLineage);
  const intelSize = assertStudioJsonWithinSizeLimit(
    "studioIntelligence",
    stored,
    INTELLIGENCE_JSON_MAX_BYTES
  );
  if (!intelSize.ok) {
    return { ok: false, error: intelSize.error };
  }

  let handoffSanitized: Record<string, unknown> | undefined;
  if (o.handoff !== undefined && o.handoff !== null) {
    handoffSanitized = sanitizeMotionHandoffForStorage(
      o.handoff as Record<string, unknown>
    );
    const handoffSize = assertStudioJsonWithinSizeLimit(
      "studioHandoff",
      handoffSanitized,
      STUDIO_HANDOFF_JSON_MAX_BYTES
    );
    if (!handoffSize.ok) {
      return { ok: false, error: handoffSize.error };
    }
  }

  const importedAt =
    typeof o.importedAt === "string" && o.importedAt.trim()
      ? o.importedAt.trim()
      : intel.importedAt;

  return {
    ok: true,
    data: {
      storyboardId,
      storyboardTitle,
      handoffVersion,
      importedAt,
      intelligence: intel,
      imageLineage,
      ...(handoffSanitized ? { handoff: handoffSanitized } : {}),
    },
  };
}

export function studioMetadataPrismaFields(
  input: StudioProjectImportInput
): Pick<
  Prisma.AnimationProjectCreateInput,
  | "studioHandoffJson"
  | "studioIntelligenceJson"
  | "studioSourceStoryboardId"
  | "studioSourceStoryboardTitle"
  | "studioHandoffVersion"
  | "studioImportedAt"
  | "studioIntelligenceStatus"
> {
  const stored = buildStoredStudioIntelligence(
    input.intelligence,
    input.imageLineage ?? []
  );
  const handoffJson =
    input.handoff !== undefined
      ? (sanitizeMotionHandoffForStorage(input.handoff as Record<string, unknown>) as Prisma.InputJsonValue)
      : undefined;
  const importedAt = input.importedAt ? new Date(input.importedAt) : new Date();

  return {
    studioHandoffJson: handoffJson,
    studioIntelligenceJson: stored as unknown as Prisma.InputJsonValue,
    studioSourceStoryboardId: input.storyboardId,
    studioSourceStoryboardTitle: input.storyboardTitle,
    studioHandoffVersion: input.handoffVersion,
    studioImportedAt: importedAt,
    studioIntelligenceStatus: "current",
  };
}

export function buildProjectStudioQaResponse(project: {
  studioSourceStoryboardId: string | null;
  studioSourceStoryboardTitle: string | null;
  studioHandoffVersion: number | null;
  studioImportedAt: Date | null;
  studioRefreshedAt?: Date | null;
  studioIntelligenceJson: unknown;
  studioIntelligenceStatus: string | null;
  studioLastStaleReason?: string | null;
  storyboardStale?: StudioIntelligenceStalenessResult | null;
}): ProjectStudioQaResponse | null {
  const stored = parseStoredIntelligence(project.studioIntelligenceJson);
  if (!stored || !project.studioSourceStoryboardId?.trim()) {
    return null;
  }
  const status = resolveStudioIntelligenceStatus(project);
  const intelligence = { ...stored };
  delete (intelligence as { imageLineage?: unknown }).imageLineage;
  delete (intelligence as { imageLineageFingerprint?: unknown }).imageLineageFingerprint;
  const readiness = computeMotionRenderReadiness({
    intelligence,
    sceneSlots: [],
  });
  const totalFromIntel = intelligence.sceneCount ?? intelligence.sceneBreakdowns.length;
  if (totalFromIntel > 0) {
    const withImage = intelligence.sceneBreakdowns.filter((s) => s.hasSelectedImage).length;
    readiness.imageAvailabilityScore =
      totalFromIntel === 0 ? 0 : Math.round((withImage / totalFromIntel) * 100);
    readiness.scenesMissingImages = Math.max(0, totalFromIntel - withImage);
  }

  const storyboardOutdated =
    status === "stale" ||
    Boolean(project.studioLastStaleReason?.trim()) ||
    Boolean(project.storyboardStale?.isStale);

  return {
    status,
    source: {
      storyboardId: project.studioSourceStoryboardId,
      storyboardTitle: project.studioSourceStoryboardTitle?.trim() || intelligence.storyboardTitle,
      handoffVersion: project.studioHandoffVersion ?? intelligence.handoffVersion,
      importedAt:
        project.studioImportedAt?.toISOString() ?? intelligence.importedAt,
      ...(project.studioRefreshedAt
        ? { refreshedAt: project.studioRefreshedAt.toISOString() }
        : {}),
    },
    intelligence,
    readiness,
    ...(project.storyboardStale ? { storyboardStale: project.storyboardStale } : {}),
    ...(storyboardOutdated ? { storyboardOutdated: true as const } : {}),
  };
}

export function buildProjectStudioExportMetadata(project: {
  studioSourceStoryboardId: string | null;
  studioSourceStoryboardTitle: string | null;
  studioHandoffVersion: number | null;
  studioImportedAt: Date | null;
  studioIntelligenceJson: unknown;
  studioIntelligenceStatus: string | null;
}): ProjectStudioExportMetadata {
  const qa = buildProjectStudioQaResponse(project);
  const status = resolveStudioIntelligenceStatus(project);
  if (!qa) {
    return {
      studioSource: null,
      studioIntelligence: null,
      studioReadiness: null,
      studioIntelligenceStatus: status,
    };
  }
  return {
    studioSource: qa.source,
    studioIntelligence: qa.intelligence,
    studioReadiness: qa.readiness,
    studioIntelligenceStatus: qa.status,
  };
}

export function buildStudioRenderAuditMetadata(project: {
  studioSourceStoryboardId: string | null;
  studioHandoffVersion: number | null;
  studioIntelligenceJson: unknown;
  studioIntelligenceStatus: string | null;
}): StudioRenderAuditMetadata {
  const stored = parseStoredIntelligence(project.studioIntelligenceJson);
  const status = resolveStudioIntelligenceStatus(project);
  const visionScores = (stored?.sceneBreakdowns ?? [])
    .map((s) => s.visionScore)
    .filter((v): v is number => typeof v === "number");
  const consistencyScores = (stored?.sceneBreakdowns ?? [])
    .map((s) => s.consistencyScore)
    .filter((v): v is number => typeof v === "number");
  const avg = (nums: number[]) =>
    nums.length === 0 ? null : Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);

  return {
    sourceStoryboardId: project.studioSourceStoryboardId,
    handoffVersion: project.studioHandoffVersion,
    studioIntelligenceStatus: status,
    selectedSceneImageIds: (stored?.imageLineage ?? [])
      .map((row) => row.studioSceneImageId)
      .filter((id): id is string => Boolean(id?.trim())),
    averageCharacterIdentityScore: stored?.overallCharacterIdentityScore ?? null,
    averageVisionScore: avg(visionScores),
    averageConsistencyScore: avg(consistencyScores),
  };
}

export function imageChangesAffectStudioIntelligence(
  audit: FullRerenderImageChangeAudit
): boolean {
  return (
    audit.reordered ||
    audit.addedCount > 0 ||
    audit.removedCount > 0 ||
    audit.replacedCount > 0
  );
}

export async function markStudioIntelligenceStaleIfImageChanges(params: {
  projectId: string;
  imageChangeAudit: FullRerenderImageChangeAudit | null;
  hasStudioMetadata: boolean;
}): Promise<StudioIntelligenceStatus | null> {
  if (!params.hasStudioMetadata || !params.imageChangeAudit) {
    return null;
  }
  if (!imageChangesAffectStudioIntelligence(params.imageChangeAudit)) {
    return "current";
  }
  const { prisma } = await import("@/lib/prisma");
  await prisma.animationProject.update({
    where: { id: params.projectId },
    data: { studioIntelligenceStatus: "stale" },
  });
  return "stale";
}
