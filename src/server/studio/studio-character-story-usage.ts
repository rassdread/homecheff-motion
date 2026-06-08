import { prisma } from "@/lib/prisma";
import type { CharacterStoryUsage } from "@/types/studio-character-canonical-references";

export async function getCharacterStoryUsage(
  characterId: string
): Promise<CharacterStoryUsage> {
  const links = await prisma.studioSceneCharacter.findMany({
    where: { characterId },
    select: {
      scene: {
        select: {
          id: true,
          storyboardId: true,
        },
      },
    },
  });

  const storyboardIds = new Set<string>();
  for (const link of links) {
    storyboardIds.add(link.scene.storyboardId);
  }

  return {
    sceneCount: links.length,
    storyboardCount: storyboardIds.size,
    storyboardIds: [...storyboardIds].sort(),
  };
}

export function emptyCharacterStoryUsage(): CharacterStoryUsage {
  return {
    sceneCount: 0,
    storyboardCount: 0,
    storyboardIds: [],
  };
}
