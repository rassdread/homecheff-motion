/**
 * Pure view model for the unified project workspace.
 * No database, no provider calls, no wallet writes.
 */

export const WORKSPACE_SECTIONS = [
  "overview",
  "scenes",
  "characters",
  "media",
  "audio",
  "export",
] as const;

export type WorkspaceSection = (typeof WORKSPACE_SECTIONS)[number];

export type WorkspaceCharacter = {
  id: string;
  name: string;
  description: string;
  referenceImageUrl: string;
  voiceAssigned: boolean;
  voiceLanguage: string;
  voiceGender: string;
  voiceSummary: string;
};

export type WorkspaceScene = {
  id: string;
  order: number;
  title: string;
  description: string;
  imageUrl: string | null;
  imageStatus: string | null;
  action?: string;
  emotion?: string;
  subtitleText?: string;
  characters?: Array<{ id: string; name: string; referenceImageUrl: string }>;
  images?: Array<{ id: string; status: string; imageUrl: string; selected: boolean }>;
};

export type WorkspaceMediaItem = {
  id: string;
  family: "image" | "video";
  title: string;
  previewUrl: string;
};

export type WorkspaceAudioClip = {
  id: string;
  kind: "music" | "sfx" | "voiceover";
  title: string;
  audioUrl: string;
  language: string;
};

export type WorkspaceExportItem = {
  id: string;
  label: string;
  status: string;
  downloadUrl: string | null;
};

export type WorkspaceJob = {
  id: string;
  capability: string;
  status: string;
};

export type WorkspaceLink = {
  id: string;
  href: string;
};

export type ProjectWorkspaceView = {
  project: {
    id: string;
    title: string;
    description: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    storyboardLinked: boolean;
    animationLinked: boolean;
    storyboardId?: string | null;
    animationProjectId?: string | null;
    narratorScript?: string;
  };
  characters: WorkspaceCharacter[];
  scenes: WorkspaceScene[];
  media: WorkspaceMediaItem[];
  /** Account music library. Not placed on a timeline. */
  music: WorkspaceAudioClip[];
  /** Account sound-effect library. Not placed on a timeline. */
  soundEffects: WorkspaceAudioClip[];
  /** Completed narration files on a linked, owned storyboard. */
  voiceover: WorkspaceAudioClip[];
  exports: WorkspaceExportItem[];
  jobs: WorkspaceJob[];
  links: WorkspaceLink[];
  mediaProjectIds: string[];
  audioLibraryAvailable: boolean;
  hcAvailable: number | null;
  director: {
    mode: "planning";
    executable: false;
  };
  timeline: null;
};

export type AssembleWorkspaceInput = {
  project: ProjectWorkspaceView["project"];
  characters: Array<{
    id: string;
    name: string;
    description: string;
    referenceImageUrl: string;
    voiceProfile: string;
    voiceLanguage: string;
    voiceGender: string;
    voiceDescription: string;
  }>;
  assets: Array<{
    id: string;
    family: string;
    title: string;
    status: string;
    previewUrl: string;
  }>;
  scenes: WorkspaceScene[];
  music: Array<{ id: string; name: string; audioUrl: string }>;
  soundEffects: Array<{ id: string; name: string; audioUrl: string }>;
  voiceover: Array<{ id: string; language: string; status: string; audioUrl: string }>;
  exports: WorkspaceExportItem[];
  jobs: WorkspaceJob[];
  links: WorkspaceLink[];
  mediaProjectIds: string[];
  audioLibraryAvailable: boolean;
  hcAvailable: number | null;
};

const COMPLETED_MEDIA = new Set(["image", "video"]);

export function isWorkspaceSection(value: string | null | undefined): value is WorkspaceSection {
  return WORKSPACE_SECTIONS.includes(value as WorkspaceSection);
}

export function assembleProjectWorkspace(input: AssembleWorkspaceInput): ProjectWorkspaceView {
  const characters = input.characters.map((character) => {
    const voiceAssigned = character.voiceProfile.trim().length > 0;
    const voiceSummary = character.voiceDescription.trim();
    return {
      id: character.id,
      name: character.name,
      description: character.description,
      referenceImageUrl: character.referenceImageUrl,
      voiceAssigned,
      voiceLanguage: character.voiceLanguage,
      voiceGender: character.voiceGender,
      voiceSummary,
    };
  });

  const media = input.assets.flatMap((asset) => {
    if (asset.status !== "active") return [];
    if (!COMPLETED_MEDIA.has(asset.family)) return [];
    if (!asset.previewUrl.trim()) return [];
    return [
      {
        id: asset.id,
        family: asset.family as "image" | "video",
        title: asset.title,
        previewUrl: asset.previewUrl,
      },
    ];
  });

  const music = input.music
    .filter((item) => item.audioUrl.trim())
    .map((item) => ({
      id: item.id,
      kind: "music" as const,
      title: item.name,
      audioUrl: item.audioUrl,
      language: "",
    }));

  const soundEffects = input.soundEffects
    .filter((item) => item.audioUrl.trim())
    .map((item) => ({
      id: item.id,
      kind: "sfx" as const,
      title: item.name,
      audioUrl: item.audioUrl,
      language: "",
    }));

  const voiceover = input.voiceover
    .filter((item) => item.status === "completed" && item.audioUrl.trim())
    .map((item) => ({
      id: item.id,
      kind: "voiceover" as const,
      title: item.language || "voice-over",
      audioUrl: item.audioUrl,
      language: item.language,
    }));

  return {
    project: input.project,
    characters,
    scenes: [...input.scenes].sort((a, b) => a.order - b.order),
    media,
    music,
    soundEffects,
    voiceover,
    exports: input.exports,
    jobs: input.jobs,
    links: input.links,
    mediaProjectIds: input.mediaProjectIds,
    audioLibraryAvailable: input.audioLibraryAvailable,
    hcAvailable: input.hcAvailable,
    director: { mode: "planning", executable: false },
    timeline: null,
  };
}
