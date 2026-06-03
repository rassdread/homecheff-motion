import { prisma } from "@/lib/prisma";
import { persistInstantSceneTextsForProject } from "@/server/instant-premium/persist-instant-scene-texts";

export type FullRerenderSettingsInput = {
  sceneTexts?: unknown;
  instantUserIntent?: string;
  instantTransitionSeconds?: number;
  instantSelectedChips?: unknown;
  versionNote?: string;
};

export async function persistFullRerenderSettingsForProject(
  projectId: string,
  input: FullRerenderSettingsInput
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (input.sceneTexts !== undefined) {
    const persisted = await persistInstantSceneTextsForProject(projectId, input.sceneTexts);
    if (!persisted.ok) {
      return { ok: false, error: persisted.error, status: persisted.status };
    }
  }

  const data: Record<string, unknown> = {};
  if (typeof input.instantUserIntent === "string") {
    data.instantUserIntent = input.instantUserIntent.trim() || null;
  }
  if (
    typeof input.instantTransitionSeconds === "number" &&
    [3, 5, 8].includes(input.instantTransitionSeconds)
  ) {
    data.instantTransitionSeconds = input.instantTransitionSeconds;
  }
  if (input.instantSelectedChips !== undefined) {
    data.instantSelectedChips = input.instantSelectedChips;
  }

  if (Object.keys(data).length > 0) {
    await prisma.animationProject.update({
      where: { id: projectId },
      data,
    });
  }

  return { ok: true };
}
