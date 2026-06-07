/**
 * Owner-level cloned voice library (blob manifest, no schema migration).
 */

export type UserVoiceCloneStatus = "completed" | "pending" | "failed";

export type UserVoiceCloneRecord = {
  cloneId: string;
  name: string;
  voiceProfileRef: string;
  previewUrl: string;
  createdAt: string;
  language: string;
  status: UserVoiceCloneStatus;
  provider: string;
  sourceCharacterId?: string;
  sampleStorageKey?: string;
};

export type UserVoiceCloneManifest = {
  version: 1;
  ownerId: string;
  updatedAt: string;
  clones: UserVoiceCloneRecord[];
};

export type UserVoiceLibraryEntry = {
  cloneId: string;
  name: string;
  previewUrl: string;
  createdAt: string;
  language: string;
  status: UserVoiceCloneStatus;
  voiceProfileRef: string;
  provider: string;
  characterCount: number;
  storyboardCount: number;
  characterIds: string[];
  storyboardIds: string[];
};

export type UserVoiceLibrary = {
  version: 1;
  ownerId: string;
  fetchedAt: string;
  voices: UserVoiceLibraryEntry[];
};
