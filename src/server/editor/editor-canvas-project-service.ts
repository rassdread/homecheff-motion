import { prisma } from "@/lib/prisma";
import { parseEditorCanvasProjectPayload } from "@/lib/editor-project-payload";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export async function listEditorCanvasProjects(
  ownerId: string,
  options?: { status?: "active" | "archived"; limit?: number }
) {
  const status = options?.status ?? "active";
  const limit = options?.limit ?? 20;
  return prisma.editorCanvasProject.findMany({
    where: { ownerId, status },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      status: true,
      updatedAt: true,
      createdAt: true,
      payload: true,
    },
  });
}

export async function getEditorCanvasProject(ownerId: string, projectId: string) {
  return prisma.editorCanvasProject.findFirst({
    where: { id: projectId, ownerId },
  });
}

export async function createEditorCanvasProject(
  ownerId: string,
  params: { id: string; name: string; payload: EditorCanvasDocument }
) {
  return prisma.editorCanvasProject.create({
    data: {
      id: params.id,
      ownerId,
      name: params.name,
      status: "active",
      payload: params.payload as object,
    },
  });
}

export async function upsertEditorCanvasProject(
  ownerId: string,
  projectId: string,
  params: { name?: string; payload: EditorCanvasDocument }
) {
  const payload = parseEditorCanvasProjectPayload(params.payload);
  if (!payload) {
    throw new Error("Invalid editor project payload");
  }
  return prisma.editorCanvasProject.upsert({
    where: { id: projectId },
    create: {
      id: projectId,
      ownerId,
      name: params.name ?? payload.name,
      status: "active",
      payload: payload as object,
    },
    update: {
      name: params.name ?? payload.name,
      payload: payload as object,
    },
  });
}

export async function forkEditorCanvasProject(ownerId: string, sourceId: string, newId: string) {
  const source = await getEditorCanvasProject(ownerId, sourceId);
  if (!source) {
    return null;
  }
  const payload = parseEditorCanvasProjectPayload(source.payload);
  if (!payload) {
    return null;
  }
  const forked: EditorCanvasDocument = {
    ...payload,
    sessionId: newId,
    name: `${source.name} (copy)`,
    status: "editing",
    updatedAt: new Date().toISOString(),
  };
  return createEditorCanvasProject(ownerId, {
    id: newId,
    name: forked.name,
    payload: forked,
  });
}

export async function archiveEditorCanvasProject(ownerId: string, projectId: string) {
  return prisma.editorCanvasProject.updateMany({
    where: { id: projectId, ownerId, status: "active" },
    data: { status: "archived", archivedAt: new Date() },
  });
}

export async function restoreEditorCanvasProject(ownerId: string, projectId: string) {
  return prisma.editorCanvasProject.updateMany({
    where: { id: projectId, ownerId, status: "archived" },
    data: { status: "active", archivedAt: null },
  });
}

export async function deleteEditorCanvasProject(ownerId: string, projectId: string) {
  return prisma.editorCanvasProject.deleteMany({
    where: { id: projectId, ownerId },
  });
}
