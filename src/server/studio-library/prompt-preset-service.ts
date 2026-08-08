/**
 * SERVER_ONLY — S.5 prompt preset storage only (no Prompt Matrix / S.6 optimization).
 */

import { prisma } from "@/lib/prisma";
import type { StudioPromptPresetScope } from "@/lib/studio-library-types";
import type { Prisma } from "@prisma/client";

export type StudioPromptPresetPayload = {
  prompt?: string;
  negativePrompt?: string;
  styleNotes?: string;
  cameraNotes?: string;
  lightingNotes?: string;
  fields?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function createPromptPreset(input: {
  ownerId: string;
  name: string;
  description?: string;
  projectId?: string | null;
  scope?: StudioPromptPresetScope;
  preset: StudioPromptPresetPayload;
  tags?: string[];
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Preset name is required.");
  return prisma.studioPromptPreset.create({
    data: {
      ownerId: input.ownerId,
      name,
      description: (input.description ?? "").trim(),
      projectId: input.projectId ?? null,
      scope: input.scope ?? "user",
      presetJson: input.preset as Prisma.InputJsonValue,
      tagsJson: (input.tags ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function listPromptPresetsForOwner(input: {
  ownerId: string;
  scope?: StudioPromptPresetScope | "all";
  projectId?: string | null;
  limit?: number;
}) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 40));
  return prisma.studioPromptPreset.findMany({
    where: {
      ownerId: input.ownerId,
      status: "active",
      ...(input.scope && input.scope !== "all" ? { scope: input.scope } : {}),
      ...(input.projectId ? { projectId: input.projectId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function getPromptPresetForOwner(presetId: string, ownerId: string) {
  return prisma.studioPromptPreset.findFirst({
    where: { id: presetId, ownerId },
  });
}
