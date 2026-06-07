import { prisma } from "@/lib/prisma";
import { getVoiceProfilePreset, normalizeStudioNarrationMode, profileIdForNarrationMode } from "@/lib/studio-voice-profiles";
import {
  parseStoryboardVoiceMetadata,
  STORYBOARD_AUDIO_UPLOAD_PROVIDER,
} from "@/lib/studio-storyboard-audio";
import { parseStoryboardAudioAssetLinks } from "@/lib/studio-storyboard-audio-asset-links";
import { listUserAudioLibraryAssets } from "@/server/studio/studio-user-audio-library-blob";
import type {
  StudioAssetUsageStats,
  StudioProjectMemorySnapshot,
  StudioNarrationAudioMemoryEntry,
  StudioLibraryAudioMemoryEntry,
  StudioShotPatternMemoryEntry,
  StudioStyleMemoryEntry,
  StudioVoiceMemoryEntry,
} from "@/types/studio-project-memory";
import type { ProductionMemoryRecord } from "@/types/studio-production-memory";
import type { StudioRenderStrategy } from "@/types/studio-render-strategy";

function finalizeStats(
  map: Map<string, { storyboardIds: Set<string>; sceneCount: number }>,
  renderByStoryboard: Map<string, number>,
  campaignsByStoryboard: Map<string, Set<string>>
): Record<string, StudioAssetUsageStats> {
  const out: Record<string, StudioAssetUsageStats> = {};
  for (const [assetId, entry] of map) {
    let renderCount = 0;
    const campaignTypes = new Set<string>();
    for (const storyboardId of entry.storyboardIds) {
      renderCount += renderByStoryboard.get(storyboardId) ?? 0;
      for (const type of campaignsByStoryboard.get(storyboardId) ?? []) {
        campaignTypes.add(type);
      }
    }
    out[assetId] = {
      storyboardCount: entry.storyboardIds.size,
      sceneCount: entry.sceneCount,
      renderCount,
      campaignCount: campaignTypes.size,
    };
  }
  return out;
}

function instantModeToRenderStrategy(instantMode: string | null | undefined): StudioRenderStrategy | undefined {
  const mode = instantMode?.trim().toLowerCase();
  if (mode === "story") {
    return "story";
  }
  if (mode === "transition") {
    return "action_chain";
  }
  return undefined;
}

function buildProductionRecords(params: {
  storyboards: Array<{
    id: string;
    title: string;
    aiDirectorPrompt: string;
    directorProfile: string;
    promptStyleProfile: string;
    voiceProfile: string;
    audioStyle: string;
    musicStyle: string;
    soundStyle: string;
    scenes: Array<{
      durationSeconds: number;
      action: string;
      description: string;
      title: string;
    }>;
  }>;
  charactersByStoryboard: Map<string, Set<string>>;
  worldsByStoryboard: Map<string, Set<string>>;
  renderStrategyByStoryboard: Map<string, StudioRenderStrategy>;
}): ProductionMemoryRecord[] {
  return params.storyboards.map((sb) => {
    const sceneCount = sb.scenes.length;
    const durationSeconds = sb.scenes.reduce(
      (sum, scene) => sum + (scene.durationSeconds > 0 ? scene.durationSeconds : 5),
      0
    );
    const shotCount = Math.max(sceneCount, 1);
    const hasCtaScene = sb.scenes.some((scene) =>
      /\b(cta|call to action|bestel|order|shop|koop|buy|visit|bezoek|download|sign up|aanmelden)\b/i.test(
        [scene.action, scene.description, scene.title].join(" ")
      )
    );

    return {
      storyboardId: sb.id,
      title: sb.title,
      ideaText: sb.aiDirectorPrompt,
      directorProfile: sb.directorProfile,
      promptStyleProfile: sb.promptStyleProfile,
      sceneCount,
      shotCount,
      durationSeconds,
      renderStrategy: params.renderStrategyByStoryboard.get(sb.id),
      voiceProfile: sb.voiceProfile?.trim() || undefined,
      audioStyle: sb.audioStyle?.trim() || undefined,
      musicStyle: sb.musicStyle?.trim() || undefined,
      soundStyle: sb.soundStyle?.trim() || undefined,
      dominantWorldIds: [...(params.worldsByStoryboard.get(sb.id) ?? [])],
      characterIds: [...(params.charactersByStoryboard.get(sb.id) ?? [])],
      hasCtaScene,
    };
  });
}

export async function buildStudioProjectMemory(ownerId: string): Promise<StudioProjectMemorySnapshot> {
  const [charLinks, locationScenes, propLinks, motionProjects, storyboards, sceneShots, characters, worldsFromChars, worldsFromLocs, worldsFromProps, uploadedVoices, storyboardsForProduction] =
    await Promise.all([
      prisma.studioSceneCharacter.findMany({
        where: { character: { ownerId } },
        select: { characterId: true, scene: { select: { storyboardId: true } } },
      }),
      prisma.studioScene.findMany({
        where: { storyboard: { ownerId }, locationId: { not: null } },
        select: { locationId: true, storyboardId: true },
      }),
      prisma.studioSceneProp.findMany({
        where: { prop: { ownerId } },
        select: { propId: true, scene: { select: { storyboardId: true } } },
      }),
      prisma.animationProject.findMany({
        where: { ownerId, studioSourceStoryboardId: { not: null } },
        select: { studioSourceStoryboardId: true, projectType: true, instantMode: true },
      }),
      prisma.studioStoryboard.findMany({
        where: { ownerId },
        select: {
          id: true,
          promptStyleProfile: true,
          directorProfile: true,
          voiceProfile: true,
          narrationMode: true,
          audioAssetMetadataJson: true,
        },
      }),
      prisma.studioScene.findMany({
        where: { storyboard: { ownerId } },
        select: { shotType: true, cameraMovement: true, storyboardId: true },
      }),
      prisma.studioCharacter.findMany({
        where: { ownerId },
        select: { id: true, voiceProfile: true, voiceEnabled: true, worldProfileId: true },
      }),
      prisma.studioCharacter.findMany({
        where: { ownerId, worldProfileId: { not: null } },
        select: { worldProfileId: true, id: true },
      }),
      prisma.studioLocation.findMany({
        where: { ownerId, worldProfileId: { not: null } },
        select: { worldProfileId: true, id: true },
      }),
      prisma.studioProp.findMany({
        where: { ownerId, worldProfileId: { not: null } },
        select: { worldProfileId: true, id: true },
      }),
      prisma.studioStoryboardVoice.findMany({
        where: {
          provider: STORYBOARD_AUDIO_UPLOAD_PROVIDER,
          status: "completed",
          storyboard: { ownerId },
        },
        select: {
          id: true,
          storyboardId: true,
          language: true,
          durationSeconds: true,
          providerMetadata: true,
        },
      }),
      prisma.studioStoryboard.findMany({
        where: { ownerId },
        select: {
          id: true,
          title: true,
          aiDirectorPrompt: true,
          directorProfile: true,
          promptStyleProfile: true,
          voiceProfile: true,
          audioStyle: true,
          musicStyle: true,
          soundStyle: true,
          scenes: {
            select: {
              durationSeconds: true,
              action: true,
              description: true,
              title: true,
            },
            orderBy: { order: "asc" },
          },
        },
      }),
    ]);

  const renderByStoryboard = new Map<string, number>();
  const campaignsByStoryboard = new Map<string, Set<string>>();
  const renderStrategyByStoryboard = new Map<string, StudioRenderStrategy>();
  for (const project of motionProjects) {
    const sbId = project.studioSourceStoryboardId!;
    renderByStoryboard.set(sbId, (renderByStoryboard.get(sbId) ?? 0) + 1);
    const strategy = instantModeToRenderStrategy(project.instantMode);
    if (strategy && !renderStrategyByStoryboard.has(sbId)) {
      renderStrategyByStoryboard.set(sbId, strategy);
    }
    const types = campaignsByStoryboard.get(sbId) ?? new Set<string>();
    if (project.projectType?.trim()) {
      types.add(project.projectType.trim());
    }
    campaignsByStoryboard.set(sbId, types);
  }

  const charMap = new Map<string, { storyboardIds: Set<string>; sceneCount: number }>();
  const charactersByStoryboard = new Map<string, Set<string>>();
  for (const link of charLinks) {
    const entry = charMap.get(link.characterId) ?? { storyboardIds: new Set(), sceneCount: 0 };
    entry.sceneCount++;
    entry.storyboardIds.add(link.scene.storyboardId);
    charMap.set(link.characterId, entry);
    const sbChars =
      charactersByStoryboard.get(link.scene.storyboardId) ?? new Set<string>();
    sbChars.add(link.characterId);
    charactersByStoryboard.set(link.scene.storyboardId, sbChars);
  }

  const locMap = new Map<string, { storyboardIds: Set<string>; sceneCount: number }>();
  for (const scene of locationScenes) {
    const locId = scene.locationId!;
    const entry = locMap.get(locId) ?? { storyboardIds: new Set(), sceneCount: 0 };
    entry.sceneCount++;
    entry.storyboardIds.add(scene.storyboardId);
    locMap.set(locId, entry);
  }

  const propMap = new Map<string, { storyboardIds: Set<string>; sceneCount: number }>();
  for (const link of propLinks) {
    const entry = propMap.get(link.propId) ?? { storyboardIds: new Set(), sceneCount: 0 };
    entry.sceneCount++;
    entry.storyboardIds.add(link.scene.storyboardId);
    propMap.set(link.propId, entry);
  }

  const worldMap = new Map<string, { storyboardIds: Set<string>; sceneCount: number }>();
  const worldsByStoryboard = new Map<string, Set<string>>();
  const charStoryboardsByChar = charMap;
  const addWorldToStoryboard = (storyboardId: string, worldId: string) => {
    const set = worldsByStoryboard.get(storyboardId) ?? new Set<string>();
    set.add(worldId);
    worldsByStoryboard.set(storyboardId, set);
  };
  for (const row of worldsFromChars) {
    if (!row.worldProfileId) {
      continue;
    }
    const charUsage = charStoryboardsByChar.get(row.id);
    if (!charUsage) {
      continue;
    }
    const entry = worldMap.get(row.worldProfileId) ?? { storyboardIds: new Set(), sceneCount: 0 };
    for (const sbId of charUsage.storyboardIds) {
      entry.storyboardIds.add(sbId);
      addWorldToStoryboard(sbId, row.worldProfileId);
    }
    entry.sceneCount += charUsage.sceneCount;
    worldMap.set(row.worldProfileId, entry);
  }
  for (const row of worldsFromLocs) {
    if (!row.worldProfileId) {
      continue;
    }
    const locUsage = locMap.get(row.id);
    if (!locUsage) {
      continue;
    }
    const entry = worldMap.get(row.worldProfileId) ?? { storyboardIds: new Set(), sceneCount: 0 };
    for (const sbId of locUsage.storyboardIds) {
      entry.storyboardIds.add(sbId);
      addWorldToStoryboard(sbId, row.worldProfileId);
    }
    entry.sceneCount += locUsage.sceneCount;
    worldMap.set(row.worldProfileId, entry);
  }
  for (const row of worldsFromProps) {
    if (!row.worldProfileId) {
      continue;
    }
    const propUsage = propMap.get(row.id);
    if (!propUsage) {
      continue;
    }
    const entry = worldMap.get(row.worldProfileId) ?? { storyboardIds: new Set(), sceneCount: 0 };
    for (const sbId of propUsage.storyboardIds) {
      entry.storyboardIds.add(sbId);
      addWorldToStoryboard(sbId, row.worldProfileId);
    }
    entry.sceneCount += propUsage.sceneCount;
    worldMap.set(row.worldProfileId, entry);
  }

  const voiceByProfile = new Map<string, { characterIds: Set<string>; storyboardIds: Set<string> }>();
  for (const character of characters) {
    if (!character.voiceEnabled || !character.voiceProfile?.trim()) {
      continue;
    }
    const profileId = character.voiceProfile.trim();
    const usage = charMap.get(character.id);
    const entry = voiceByProfile.get(profileId) ?? { characterIds: new Set(), storyboardIds: new Set() };
    entry.characterIds.add(character.id);
    if (usage) {
      for (const sbId of usage.storyboardIds) {
        entry.storyboardIds.add(sbId);
      }
    }
    voiceByProfile.set(profileId, entry);
  }
  for (const sb of storyboards) {
    const profileId =
      sb.voiceProfile?.trim() ||
      profileIdForNarrationMode(normalizeStudioNarrationMode(sb.narrationMode || "narrator"));
    if (!profileId) {
      continue;
    }
    const entry = voiceByProfile.get(profileId) ?? { characterIds: new Set(), storyboardIds: new Set() };
    entry.storyboardIds.add(sb.id);
    voiceByProfile.set(profileId, entry);
  }

  const voices: StudioVoiceMemoryEntry[] = [...voiceByProfile.entries()]
    .map(([profileId, usage]) => {
      const preset = getVoiceProfilePreset(profileId);
      return {
        profileId,
        labelKey: preset.labelKey,
        characterCount: usage.characterIds.size,
        storyboardCount: usage.storyboardIds.size,
      };
    })
    .sort((a, b) => b.storyboardCount - a.storyboardCount);

  const styleMap = new Map<string, StudioStyleMemoryEntry>();
  for (const sb of storyboards) {
    const key = `${sb.promptStyleProfile}::${sb.directorProfile}`;
    const entry = styleMap.get(key) ?? {
      promptStyleProfile: sb.promptStyleProfile,
      directorProfile: sb.directorProfile,
      storyboardCount: 0,
    };
    entry.storyboardCount++;
    styleMap.set(key, entry);
  }

  const narrationAudio: StudioNarrationAudioMemoryEntry[] = uploadedVoices
    .map((voice) => {
      const meta = parseStoryboardVoiceMetadata(voice.providerMetadata);
      return {
        id: voice.id,
        storyboardId: voice.storyboardId,
        displayName: meta.displayName?.trim() || meta.fileName?.trim() || "Uploaded audio",
        language: voice.language,
        durationSeconds: voice.durationSeconds,
      };
    })
    .sort((a, b) => b.durationSeconds - a.durationSeconds);

  const libraryUsage = new Map<string, { storyboardIds: Set<string> }>();
  for (const sb of storyboards) {
    const links = parseStoryboardAudioAssetLinks(sb.audioAssetMetadataJson);
    for (const assetId of [links.musicAssetId, links.soundAssetId]) {
      if (!assetId) {
        continue;
      }
      const entry = libraryUsage.get(assetId) ?? { storyboardIds: new Set() };
      entry.storyboardIds.add(sb.id);
      libraryUsage.set(assetId, entry);
    }
  }

  const userLibraryAssets = await listUserAudioLibraryAssets(ownerId);

  const shotPatternMap = new Map<
    string,
    { shotType: string; cameraMovement: string; storyboardIds: Set<string>; sceneCount: number }
  >();
  for (const scene of sceneShots) {
    const shotType = scene.shotType?.trim() || "medium";
    const cameraMovement = scene.cameraMovement?.trim() || "static";
    const key = `${shotType}::${cameraMovement}`;
    const entry =
      shotPatternMap.get(key) ??
      { shotType, cameraMovement, storyboardIds: new Set<string>(), sceneCount: 0 };
    entry.sceneCount++;
    entry.storyboardIds.add(scene.storyboardId);
    shotPatternMap.set(key, entry);
  }
  const shotPatterns: StudioShotPatternMemoryEntry[] = [...shotPatternMap.values()]
    .map((entry) => ({
      shotType: entry.shotType,
      cameraMovement: entry.cameraMovement,
      storyboardCount: entry.storyboardIds.size,
      sceneCount: entry.sceneCount,
    }))
    .sort((a, b) => b.storyboardCount - a.storyboardCount || b.sceneCount - a.sceneCount);

  const libraryAudio: StudioLibraryAudioMemoryEntry[] = userLibraryAssets.map((asset) => {
    const usage = libraryUsage.get(asset.id);
    const storyboardCount = usage?.storyboardIds.size ?? 0;
    let renderCount = 0;
    if (usage) {
      for (const sbId of usage.storyboardIds) {
        renderCount += renderByStoryboard.get(sbId) ?? 0;
      }
    }
    return {
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      storyboardCount,
      renderCount,
    };
  });

  const productionRecords = buildProductionRecords({
    storyboards: storyboardsForProduction,
    charactersByStoryboard,
    worldsByStoryboard,
    renderStrategyByStoryboard,
  });

  return {
    characters: finalizeStats(charMap, renderByStoryboard, campaignsByStoryboard),
    locations: finalizeStats(locMap, renderByStoryboard, campaignsByStoryboard),
    props: finalizeStats(propMap, renderByStoryboard, campaignsByStoryboard),
    worlds: finalizeStats(worldMap, renderByStoryboard, campaignsByStoryboard),
    voices,
    narrationAudio,
    libraryAudio,
    styles: [...styleMap.values()].sort((a, b) => b.storyboardCount - a.storyboardCount),
    shotPatterns,
    productionRecords,
  };
}
