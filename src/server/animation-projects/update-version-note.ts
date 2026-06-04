import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appendBundleAuditEntry, parseBundleAuditJson } from "@/lib/bundle-audit";

const MAX_NOTE_LENGTH = 200;

export type UpdateVersionNoteInput = {
  projectId: string;
  ownerId: string;
  isAdmin: boolean;
  kind: "render" | "language";
  targetId: string;
  versionNote: string | null;
};

export type UpdateVersionNoteResult =
  | { ok: true; kind: "render" | "language"; targetId: string; versionNote: string | null }
  | { ok: false; code: string; message: string };

export async function updateProjectVersionNote(
  params: UpdateVersionNoteInput
): Promise<UpdateVersionNoteResult> {
  const project = await prisma.animationProject.findFirst({
    where: params.isAdmin
      ? { id: params.projectId }
      : { id: params.projectId, ownerId: params.ownerId },
    select: { id: true, ownerId: true, bundleAuditJson: true },
  });

  if (!project) {
    return { ok: false, code: "NOT_FOUND", message: "Project not found." };
  }

  const note = params.versionNote?.trim().slice(0, MAX_NOTE_LENGTH) || null;

  if (params.kind === "render") {
    const row = await prisma.projectRenderVersion.findFirst({
      where: { id: params.targetId, projectId: project.id },
      select: { id: true, versionNote: true, renderVersionNumber: true },
    });
    if (!row) {
      return { ok: false, code: "NOT_FOUND", message: "Render version not found." };
    }
    await prisma.$transaction([
      prisma.projectRenderVersion.update({
        where: { id: row.id },
        data: { versionNote: note },
      }),
      prisma.animationProject.update({
        where: { id: project.id },
        data: {
          bundleAuditJson: appendBundleAuditEntry(parseBundleAuditJson(project.bundleAuditJson), {
            type: "version_note",
            userId: params.ownerId,
            before: row.versionNote,
            after: note,
            meta: { kind: "render", targetId: row.id, version: row.renderVersionNumber },
          }) as Prisma.InputJsonValue,
        },
      }),
    ]);
    return { ok: true, kind: "render", targetId: row.id, versionNote: note };
  }

  const langRow = await prisma.videoLanguageExport.findFirst({
    where: { id: params.targetId, projectId: project.id },
    select: { id: true, versionNote: true, languageCode: true, version: true },
  });
  if (!langRow) {
    return { ok: false, code: "NOT_FOUND", message: "Language version not found." };
  }

  await prisma.$transaction([
    prisma.videoLanguageExport.update({
      where: { id: langRow.id },
      data: { versionNote: note },
    }),
    prisma.animationProject.update({
      where: { id: project.id },
      data: {
        bundleAuditJson: appendBundleAuditEntry(parseBundleAuditJson(project.bundleAuditJson), {
          type: "version_note",
          userId: params.ownerId,
          before: langRow.versionNote,
          after: note,
          meta: {
            kind: "language",
            targetId: langRow.id,
            languageCode: langRow.languageCode,
            version: langRow.version,
          },
        }) as Prisma.InputJsonValue,
      },
    }),
  ]);

  return { ok: true, kind: "language", targetId: langRow.id, versionNote: note };
}
