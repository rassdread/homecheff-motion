import { prisma } from "@/lib/prisma";
import { getVoiceProfilePreset, normalizeStudioNarrationMode, profileIdForNarrationMode } from "@/lib/studio-voice-profiles";
import {
  parseStoryboardVoiceMetadata,
  STORYBOARD_AUDIO_UPLOAD_PROVIDER,
} from "@/lib/studio-storyboard-audio";
import type {
  StudioAssetUsageStats,
  StudioProjectMemorySnapshot,
  StudioNarrationAudioMemoryEntry,
  StudioStyleMemoryEntry,
  StudioVoiceMemoryEntry,
} from "@/types/studio-project-memory";

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

export async function buildStudioProjectMemory(ownerId: string): Promise<StudioProjectMemorySnapshot> {
  const [charLinks, locationScenes, propLinks, motionProjects, storyboards, characters, worldsFromChars, worldsFromLocs, worldsFromProps, uploadedVoices] =
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
        select: { studioSourceStoryboardId: true, projectType: true },
      }),
      prisma.studioStoryboard.findMany({
        where: { ownerId },
        select: {
          id: true,
          promptStyleProfile: true,
          directorProfile: true,
          voiceProfile: true,
          narrationMode: true,
        },
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
    ]);

  const renderByStoryboard = new Map<string, number>();
  const campaignsByStoryboard = new Map<string, Set<string>>();
  for (const project of motionProjects) {
    const sbId = project.studioSourceStoryboardId!;
    renderByStoryboard.set(sbId, (renderByStoryboard.get(sbId) ?? 0) + 1);
    const types = campaignsByStoryboard.get(sbId) ?? new Set<string>();
    if (project.projectType?.trim()) {
      types.add(project.projectType.trim());
    }
    campaignsByStoryboard.set(sbId, types);
  }

  const charMap = new Map<string, { storyboardIds: Set<string>; sceneCount: number }>();
  for (const link of charLinks) {
    const entry = charMap.get(link.characterId) ?? { storyboardIds: new Set(), sceneCount: 0 };
    entry.sceneCount++;
    entry.storyboardIds.add(link.scene.storyboardId);
    charMap.set(link.characterId, entry);
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
  const charStoryboardsByChar = charMap;
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

  return {
    characters: finalizeStats(charMap, renderByStoryboard, campaignsByStoryboard),
    locations: finalizeStats(locMap, renderByStoryboard, campaignsByStoryboard),
    props: finalizeStats(propMap, renderByStoryboard, campaignsByStoryboard),
    worlds: finalizeStats(worldMap, renderByStoryboard, campaignsByStoryboard),
    voices,
    narrationAudio,
    styles: [...styleMap.values()].sort((a, b) => b.storyboardCount - a.storyboardCount),
  };
}
