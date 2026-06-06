import type {
  StudioAssetUsageStats,
  StudioProjectMemorySnapshot,
} from "@/types/studio-project-memory";

export function emptyAssetUsageStats(): StudioAssetUsageStats {
  return { storyboardCount: 0, sceneCount: 0, renderCount: 0, campaignCount: 0 };
}

export function getAssetUsageStats(
  memory: StudioProjectMemorySnapshot,
  kind: "characters" | "locations" | "props" | "worlds",
  assetId: string
): StudioAssetUsageStats {
  return memory[kind][assetId] ?? emptyAssetUsageStats();
}

export function emptyProjectMemorySnapshot(): StudioProjectMemorySnapshot {
  return {
    characters: {},
    locations: {},
    props: {},
    worlds: {},
    voices: [],
    narrationAudio: [],
    libraryAudio: [],
    styles: [],
  };
}
