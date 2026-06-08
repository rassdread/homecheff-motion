import { prisma } from "@/lib/prisma";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import type {
  AssetStoryUsageReport,
  AssetUsageKind,
  AssetUsageStoryboardRef,
  StoryboardRelationshipsReport,
} from "@/types/studio-asset-usage";

function storyboardHref(storyboardId: string): string {
  return studioWorkspaceHref(storyboardId);
}

function sceneHref(storyboardId: string, sceneId: string): string {
  return `${studioWorkspaceHref(storyboardId)}&sceneId=${encodeURIComponent(sceneId)}`;
}

function groupScenesByStoryboard(
  rows: Array<{
    scene: {
      id: string;
      order: number;
      title: string;
      storyboardId: string;
      storyboard: { id: string; title: string };
    };
  }>
): AssetUsageStoryboardRef[] {
  const map = new Map<string, AssetUsageStoryboardRef>();

  for (const row of rows) {
    const sb = row.scene.storyboard;
    const sbId = sb.id;
    let entry = map.get(sbId);
    if (!entry) {
      entry = {
        storyboardId: sbId,
        storyboardTitle: sb.title?.trim() || "Storyboard",
        href: storyboardHref(sbId),
        scenes: [],
      };
      map.set(sbId, entry);
    }
    if (!entry.scenes.some((s) => s.sceneId === row.scene.id)) {
      entry.scenes.push({
        sceneId: row.scene.id,
        sceneOrder: row.scene.order,
        sceneTitle: row.scene.title?.trim() || `Scene ${row.scene.order + 1}`,
        href: sceneHref(sbId, row.scene.id),
      });
    }
  }

  for (const entry of map.values()) {
    entry.scenes.sort((a, b) => a.sceneOrder - b.sceneOrder);
  }

  return [...map.values()].sort((a, b) => a.storyboardTitle.localeCompare(b.storyboardTitle));
}

export async function getCharacterAssetUsage(
  characterId: string,
  assetName: string
): Promise<AssetStoryUsageReport> {
  const links = await prisma.studioSceneCharacter.findMany({
    where: { characterId },
    select: {
      scene: {
        select: {
          id: true,
          order: true,
          title: true,
          storyboardId: true,
          storyboard: { select: { id: true, title: true } },
        },
      },
    },
  });

  const storyboards = groupScenesByStoryboard(links);
  return {
    kind: "character",
    assetId: characterId,
    assetName,
    sceneCount: links.length,
    storyboardCount: storyboards.length,
    storyboards,
  };
}

export async function getPropAssetUsage(
  propId: string,
  assetName: string
): Promise<AssetStoryUsageReport> {
  const links = await prisma.studioSceneProp.findMany({
    where: { propId },
    select: {
      scene: {
        select: {
          id: true,
          order: true,
          title: true,
          storyboardId: true,
          storyboard: { select: { id: true, title: true } },
        },
      },
    },
  });

  const storyboards = groupScenesByStoryboard(links);
  return {
    kind: "prop",
    assetId: propId,
    assetName,
    sceneCount: links.length,
    storyboardCount: storyboards.length,
    storyboards,
  };
}

export async function getLocationAssetUsage(
  locationId: string,
  assetName: string
): Promise<AssetStoryUsageReport> {
  const scenes = await prisma.studioScene.findMany({
    where: { locationId },
    select: {
      id: true,
      order: true,
      title: true,
      storyboardId: true,
      storyboard: { select: { id: true, title: true } },
    },
  });

  const storyboards = groupScenesByStoryboard(scenes.map((scene) => ({ scene })));
  return {
    kind: "location",
    assetId: locationId,
    assetName,
    sceneCount: scenes.length,
    storyboardCount: storyboards.length,
    storyboards,
  };
}

export async function getWorldAssetUsage(
  worldId: string,
  assetName: string
): Promise<AssetStoryUsageReport> {
  const [characters, props, locations] = await Promise.all([
    prisma.studioCharacter.findMany({
      where: { worldProfileId: worldId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.studioProp.findMany({
      where: { worldProfileId: worldId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.studioLocation.findMany({
      where: { worldProfileId: worldId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const storyboardIdSet = new Set<string>();
  const sceneRows: Array<{
    scene: {
      id: string;
      order: number;
      title: string;
      storyboardId: string;
      storyboard: { id: string; title: string };
    };
  }> = [];

  if (characters.length > 0) {
    const charLinks = await prisma.studioSceneCharacter.findMany({
      where: { characterId: { in: characters.map((c) => c.id) } },
      select: {
        scene: {
          select: {
            id: true,
            order: true,
            title: true,
            storyboardId: true,
            storyboard: { select: { id: true, title: true } },
          },
        },
      },
    });
    for (const link of charLinks) {
      sceneRows.push(link);
      storyboardIdSet.add(link.scene.storyboardId);
    }
  }

  if (locations.length > 0) {
    const locScenes = await prisma.studioScene.findMany({
      where: { locationId: { in: locations.map((l) => l.id) } },
      select: {
        id: true,
        order: true,
        title: true,
        storyboardId: true,
        storyboard: { select: { id: true, title: true } },
      },
    });
    for (const scene of locScenes) {
      sceneRows.push({ scene });
      storyboardIdSet.add(scene.storyboardId);
    }
  }

  const storyboards = groupScenesByStoryboard(sceneRows);

  return {
    kind: "world",
    assetId: worldId,
    assetName,
    sceneCount: sceneRows.length,
    storyboardCount: storyboards.length,
    storyboards,
    characters: characters.map((c) => ({
      id: c.id,
      name: c.name,
      href: `/studio/characters/${c.id}`,
    })),
    props: props.map((p) => ({
      id: p.id,
      name: p.name,
      href: `/studio/props/${p.id}`,
    })),
    locations: locations.map((l) => ({
      id: l.id,
      name: l.name,
      href: `/studio/locations/${l.id}`,
    })),
  };
}

export async function getAssetStoryUsage(
  kind: AssetUsageKind,
  assetId: string,
  assetName: string
): Promise<AssetStoryUsageReport> {
  switch (kind) {
    case "character":
      return getCharacterAssetUsage(assetId, assetName);
    case "prop":
      return getPropAssetUsage(assetId, assetName);
    case "location":
      return getLocationAssetUsage(assetId, assetName);
    case "world":
      return getWorldAssetUsage(assetId, assetName);
    default:
      throw new Error(`Unsupported asset kind: ${kind satisfies never}`);
  }
}

export async function getStoryboardRelationships(
  storyboardId: string
): Promise<StoryboardRelationshipsReport | null> {
  const storyboard = await prisma.studioStoryboard.findUnique({
    where: { id: storyboardId },
    select: {
      id: true,
      title: true,
      voices: { select: { language: true, status: true } },
      scenes: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          title: true,
          location: { select: { id: true, name: true, worldProfileId: true } },
          characters: {
            select: {
              character: { select: { id: true, name: true, worldProfileId: true } },
            },
          },
          props: {
            select: {
              prop: { select: { id: true, name: true, worldProfileId: true } },
            },
          },
          selectedSceneImageId: true,
        },
      },
    },
  });

  if (!storyboard) {
    return null;
  }

  const worldIds = new Set<string>();
  const worldNames = new Map<string, string>();

  for (const scene of storyboard.scenes) {
    if (scene.location?.worldProfileId) {
      worldIds.add(scene.location.worldProfileId);
    }
    for (const c of scene.characters) {
      if (c.character.worldProfileId) {
        worldIds.add(c.character.worldProfileId);
      }
    }
    for (const p of scene.props) {
      if (p.prop.worldProfileId) {
        worldIds.add(p.prop.worldProfileId);
      }
    }
  }

  if (worldIds.size > 0) {
    const worlds = await prisma.studioWorldProfile.findMany({
      where: { id: { in: [...worldIds] } },
      select: { id: true, name: true },
    });
    for (const w of worlds) {
      worldNames.set(w.id, w.name);
    }
  }

  return {
    storyboardId: storyboard.id,
    storyboardTitle: storyboard.title?.trim() || "Storyboard",
    sceneCount: storyboard.scenes.length,
    worldProfiles: [...worldIds].map((id) => ({
      id,
      name: worldNames.get(id) ?? "World",
      href: `/studio/worlds/${id}`,
    })),
    voices: storyboard.voices.map((v) => ({
      language: v.language,
      status: v.status,
    })),
    scenes: storyboard.scenes.map((scene) => ({
      sceneId: scene.id,
      order: scene.order,
      title: scene.title?.trim() || `Scene ${scene.order + 1}`,
      location:
        scene.location ?
          {
            id: scene.location.id,
            name: scene.location.name,
            href: `/studio/locations/${scene.location.id}`,
          }
        : null,
      characters: scene.characters.map((c) => ({
        id: c.character.id,
        name: c.character.name,
        href: `/studio/characters/${c.character.id}`,
      })),
      props: scene.props.map((p) => ({
        id: p.prop.id,
        name: p.prop.name,
        href: `/studio/props/${p.prop.id}`,
      })),
      hasGeneratedImage: Boolean(scene.selectedSceneImageId),
    })),
  };
}

export function assetUsageKindFromParam(
  kind: string
): kind is AssetUsageKind {
  return kind === "character" || kind === "prop" || kind === "location" || kind === "world";
}
