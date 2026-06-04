import { prisma } from "@/lib/prisma";
import {
  buildInitialFullRerenderDraftPayload,
  parseFullRerenderDraftPayload,
  type PersistedFullRerenderDraftPayload,
} from "@/lib/full-rerender-draft";
export type FullRerenderDraftProject = {
  id: string;
  instantSceneTexts: unknown;
  instantUserIntent: string | null;
  instantTransitionSeconds: number;
  instantMode: string;
  images: Array<{
    id: string;
    previewUrl: string | null;
    viduInputUrl: string | null;
    fileName: string | null;
  }>;
};

export type FullRerenderDraftSummary = {
  projectId: string;
  updatedAt: string;
  createdAt: string;
  sceneCount: number;
  versionNote: string | null;
};

export async function getFullRerenderDraftForProject(
  projectId: string
): Promise<PersistedFullRerenderDraftPayload | null> {
  const meta = await getFullRerenderDraftMeta(projectId);
  return meta?.draft ?? null;
}

export async function getFullRerenderDraftMeta(
  projectId: string
): Promise<{ draft: PersistedFullRerenderDraftPayload; updatedAt: string } | null> {
  const row = await prisma.projectFullRerenderDraft.findUnique({
    where: { projectId },
  });
  if (!row) {
    return null;
  }
  const draft = parseFullRerenderDraftPayload(row.payload);
  if (!draft) {
    return null;
  }
  return { draft, updatedAt: row.updatedAt.toISOString() };
}

export async function upsertFullRerenderDraft(
  projectId: string,
  payload: PersistedFullRerenderDraftPayload
): Promise<{ ok: true; updatedAt: string }> {
  const row = await prisma.projectFullRerenderDraft.upsert({
    where: { projectId },
    create: { projectId, payload },
    update: { payload },
  });
  return { ok: true, updatedAt: row.updatedAt.toISOString() };
}

export async function deleteFullRerenderDraft(projectId: string): Promise<void> {
  await prisma.projectFullRerenderDraft.deleteMany({ where: { projectId } });
}

export async function ensureFullRerenderDraftForProject(
  project: FullRerenderDraftProject
): Promise<PersistedFullRerenderDraftPayload> {
  const existing = await getFullRerenderDraftForProject(project.id);
  if (existing) {
    return existing;
  }
  const images = project.images.map((img) => ({
    id: img.id,
    previewUrl: img.previewUrl ?? img.viduInputUrl ?? "",
    fileName: img.fileName,
  }));
  const payload = buildInitialFullRerenderDraftPayload({
    images,
    instantSceneTexts: project.instantSceneTexts,
    instantUserIntent: project.instantUserIntent,
    instantTransitionSeconds: project.instantTransitionSeconds,
    instantMode: project.instantMode,
  });
  await upsertFullRerenderDraft(project.id, payload);
  return payload;
}

export async function listFullRerenderDraftSummariesForOwner(
  ownerId: string
): Promise<FullRerenderDraftSummary[]> {
  const rows = await prisma.projectFullRerenderDraft.findMany({
    where: { project: { ownerId } },
    orderBy: { updatedAt: "desc" },
    include: {
      project: { select: { id: true } },
    },
  });
  return rows
    .map((row) => {
      const payload = parseFullRerenderDraftPayload(row.payload);
      if (!payload) {
        return null;
      }
      return {
        projectId: row.projectId,
        updatedAt: row.updatedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
        sceneCount: payload.slots.filter((s) => s.image !== null).length,
        versionNote: payload.versionNote.trim() || null,
      };
    })
    .filter((row): row is FullRerenderDraftSummary => row !== null);
}
