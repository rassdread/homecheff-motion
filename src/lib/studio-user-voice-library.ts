/**
 * Owner-level cloned voice library — manifest + usage aggregation (no schema).
 */

import { prisma } from "@/lib/prisma";
import {
  formatClonedVoiceProfileRef,
  isClonedVoiceProfileRef,
  isInvalidProviderVoiceProfileRef,
  parseVoiceProfileRef,
  resolveProviderVoiceIdFromProfile,
  safeFormatClonedVoiceProfileRef,
} from "@/lib/studio-voice-profile-ref";
import {
  readUserVoiceCloneManifest,
  upsertUserVoiceCloneRecord,
} from "@/server/studio/studio-user-voice-clone-blob";
import type {
  UserVoiceCloneRecord,
  UserVoiceLibrary,
  UserVoiceLibraryEntry,
} from "@/types/studio-user-voice-library";

type CloneUsage = {
  characterIds: Set<string>;
  storyboardIds: Set<string>;
  lastUsedAt: string | null;
};

function cloneIdFromProfile(voiceProfile: string): string | null {
  if (isInvalidProviderVoiceProfileRef(voiceProfile)) {
    return null;
  }
  return resolveProviderVoiceIdFromProfile(voiceProfile);
}

function isInvalidStoredVoiceProfileRef(voiceProfile: string): boolean {
  return isInvalidProviderVoiceProfileRef(voiceProfile);
}

function mergeCloneRecord(
  map: Map<string, UserVoiceCloneRecord & { characterIds: Set<string> }>,
  record: Omit<UserVoiceCloneRecord, "voiceProfileRef"> & { voiceProfileRef?: string },
  characterId?: string
): void {
  if (!record.cloneId.trim()) {
    return;
  }
  const voiceProfileRef =
    record.voiceProfileRef?.trim() ||
    safeFormatClonedVoiceProfileRef(record.cloneId) ||
    undefined;
  if (!voiceProfileRef || isInvalidStoredVoiceProfileRef(voiceProfileRef)) {
    return;
  }
  const existing = map.get(record.cloneId);
  if (existing) {
    if (record.name.trim() && (!existing.name || existing.name.startsWith("mock-clone"))) {
      existing.name = record.name;
    }
    if (record.previewUrl && !existing.previewUrl) {
      existing.previewUrl = record.previewUrl;
    }
    if (record.createdAt < existing.createdAt) {
      existing.createdAt = record.createdAt;
    }
    if (characterId) {
      existing.characterIds.add(characterId);
    }
    return;
  }
  map.set(record.cloneId, {
    cloneId: record.cloneId,
    name: record.name,
    voiceProfileRef,
    previewUrl: record.previewUrl ?? "",
    createdAt: record.createdAt,
    language: record.language || "en",
    status: record.status ?? "completed",
    provider: record.provider || "elevenlabs",
    sourceCharacterId: record.sourceCharacterId,
    sampleStorageKey: record.sampleStorageKey,
    characterIds: new Set(characterId ? [characterId] : []),
  });
}

async function deriveClonesFromCharacters(ownerId: string): Promise<
  Map<string, UserVoiceCloneRecord & { characterIds: Set<string> }>
> {
  const map = new Map<string, UserVoiceCloneRecord & { characterIds: Set<string> }>();
  const characters = await prisma.studioCharacter.findMany({
    where: { ownerId },
    select: {
      id: true,
      voiceProfile: true,
      voiceDescription: true,
      voiceLanguage: true,
      voiceEnabled: true,
      createdAt: true,
      voiceHistory: {
        where: { eventType: "voice_clone_applied" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, snapshotJson: true },
      },
    },
  });

  for (const character of characters) {
    if (!isClonedVoiceProfileRef(character.voiceProfile)) {
      continue;
    }
    const cloneId = cloneIdFromProfile(character.voiceProfile);
    if (!cloneId) {
      continue;
    }
    const historyAt = character.voiceHistory[0]?.createdAt?.toISOString();
    mergeCloneRecord(
      map,
      {
        cloneId,
        name: character.voiceDescription.trim() || cloneId,
        previewUrl: "",
        createdAt: historyAt ?? character.createdAt.toISOString(),
        language: (character.voiceLanguage || "en").slice(0, 2),
        status: "completed",
        provider: "elevenlabs",
        sourceCharacterId: character.id,
        voiceProfileRef: parseVoiceProfileRef(character.voiceProfile).raw,
      },
      character.id
    );
  }

  return map;
}

async function computeCloneUsage(ownerId: string): Promise<Map<string, CloneUsage>> {
  const usage = new Map<string, CloneUsage>();

  const characters = await prisma.studioCharacter.findMany({
    where: { ownerId },
    select: {
      id: true,
      voiceProfile: true,
      voiceProfilesJson: true,
      updatedAt: true,
      sceneLinks: { select: { scene: { select: { storyboardId: true } } } },
    },
  });

  const touchClone = (cloneId: string, characterId: string, storyboardIds: Set<string>, at: Date) => {
    const entry = usage.get(cloneId) ?? {
      characterIds: new Set<string>(),
      storyboardIds: new Set<string>(),
      lastUsedAt: null,
    };
    entry.characterIds.add(characterId);
    for (const sbId of storyboardIds) {
      entry.storyboardIds.add(sbId);
    }
    const iso = at.toISOString();
    if (!entry.lastUsedAt || iso > entry.lastUsedAt) {
      entry.lastUsedAt = iso;
    }
    usage.set(cloneId, entry);
  };

  for (const character of characters) {
    const profiles = new Set<string>();
    if (isClonedVoiceProfileRef(character.voiceProfile)) {
      profiles.add(character.voiceProfile);
    }
    if (character.voiceProfilesJson && typeof character.voiceProfilesJson === "object") {
      for (const row of Object.values(character.voiceProfilesJson as Record<string, unknown>)) {
        if (row && typeof row === "object" && !Array.isArray(row)) {
          const profile = (row as { voiceProfile?: string }).voiceProfile;
          if (profile && isClonedVoiceProfileRef(profile)) {
            profiles.add(profile);
          }
        }
      }
    }
    const storyboardIds = new Set(character.sceneLinks.map((link) => link.scene.storyboardId));
    for (const profile of profiles) {
      const cloneId = cloneIdFromProfile(profile);
      if (!cloneId) {
        continue;
      }
      touchClone(cloneId, character.id, storyboardIds, character.updatedAt);
    }
  }

  const storyboards = await prisma.studioStoryboard.findMany({
    where: { ownerId },
    select: { id: true, voiceProfile: true, updatedAt: true },
  });
  for (const storyboard of storyboards) {
    if (!isClonedVoiceProfileRef(storyboard.voiceProfile)) {
      continue;
    }
    const cloneId = cloneIdFromProfile(storyboard.voiceProfile);
    if (!cloneId) {
      continue;
    }
    const entry = usage.get(cloneId) ?? {
      characterIds: new Set<string>(),
      storyboardIds: new Set<string>(),
      lastUsedAt: null,
    };
    entry.storyboardIds.add(storyboard.id);
    const iso = storyboard.updatedAt.toISOString();
    if (!entry.lastUsedAt || iso > entry.lastUsedAt) {
      entry.lastUsedAt = iso;
    }
    usage.set(cloneId, entry);
  }

  return usage;
}

export async function buildUserVoiceLibrary(ownerId: string): Promise<UserVoiceLibrary> {
  const [manifest, derived, usageMap] = await Promise.all([
    readUserVoiceCloneManifest(ownerId),
    deriveClonesFromCharacters(ownerId),
    computeCloneUsage(ownerId),
  ]);

  const merged = new Map<string, UserVoiceCloneRecord & { characterIds: Set<string> }>();

  for (const record of manifest.clones) {
    mergeCloneRecord(merged, record);
  }
  for (const [, record] of derived) {
    mergeCloneRecord(merged, record, [...record.characterIds][0]);
    const existing = merged.get(record.cloneId);
    if (existing) {
      for (const id of record.characterIds) {
        existing.characterIds.add(id);
      }
    }
  }

  const voices: UserVoiceLibraryEntry[] = [...merged.values()]
    .map((record) => {
      const usage = usageMap.get(record.cloneId) ?? {
        characterIds: new Set<string>(),
        storyboardIds: new Set<string>(),
        lastUsedAt: null,
      };
      for (const id of record.characterIds) {
        usage.characterIds.add(id);
      }
      const lastUsedAt = usage.lastUsedAt ?? record.createdAt;
      return {
        cloneId: record.cloneId,
        name: record.name,
        previewUrl: record.previewUrl,
        createdAt: record.createdAt,
        lastUsedAt,
        language: record.language,
        status: record.status,
        voiceProfileRef: record.voiceProfileRef,
        provider: record.provider,
        characterCount: usage.characterIds.size,
        storyboardCount: usage.storyboardIds.size,
        characterIds: [...usage.characterIds],
        storyboardIds: [...usage.storyboardIds],
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    version: 1,
    ownerId,
    fetchedAt: new Date().toISOString(),
    voices,
  };
}

export async function registerUserVoiceClone(params: {
  ownerId: string;
  cloneId: string;
  name: string;
  voiceProfileRef: string;
  previewUrl?: string | null;
  language: string;
  provider: string;
  sourceCharacterId?: string;
  sampleStorageKey?: string;
}): Promise<UserVoiceCloneRecord> {
  return upsertUserVoiceCloneRecord({
    ownerId: params.ownerId,
    record: {
      cloneId: params.cloneId,
      name: params.name.trim().slice(0, 120),
      voiceProfileRef: params.voiceProfileRef,
      previewUrl: params.previewUrl?.trim() ?? "",
      createdAt: new Date().toISOString(),
      language: params.language.slice(0, 2),
      status: "completed",
      provider: params.provider,
      sourceCharacterId: params.sourceCharacterId,
      sampleStorageKey: params.sampleStorageKey,
    },
  });
}

export async function renameUserVoiceClone(params: {
  ownerId: string;
  cloneId: string;
  name: string;
}): Promise<UserVoiceLibraryEntry | null> {
  const { renameUserVoiceCloneRecord } = await import(
    "@/server/studio/studio-user-voice-clone-blob"
  );
  const renamed = await renameUserVoiceCloneRecord(params);
  if (!renamed) {
    return null;
  }

  await prisma.studioCharacter.updateMany({
    where: {
      ownerId: params.ownerId,
      voiceProfile: formatClonedVoiceProfileRef(params.cloneId),
    },
    data: {
      voiceDescription: params.name.trim().slice(0, 120),
    },
  });

  const library = await buildUserVoiceLibrary(params.ownerId);
  return library.voices.find((v) => v.cloneId === params.cloneId) ?? null;
}

export function findUserVoiceCloneEntry(
  library: UserVoiceLibrary,
  cloneId: string
): UserVoiceLibraryEntry | undefined {
  return library.voices.find((v) => v.cloneId === cloneId);
}
