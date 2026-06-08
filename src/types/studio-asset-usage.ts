/** Where a studio asset appears in storyboards/scenes. */

export type AssetUsageKind = "character" | "prop" | "location" | "world";

export type AssetUsageSceneRef = {
  sceneId: string;
  sceneOrder: number;
  sceneTitle: string;
  href: string;
};

export type AssetUsageStoryboardRef = {
  storyboardId: string;
  storyboardTitle: string;
  href: string;
  scenes: AssetUsageSceneRef[];
};

export type AssetUsageWorldMemberRef = {
  id: string;
  name: string;
  href: string;
};

export type AssetStoryUsageReport = {
  kind: "character" | "prop" | "location" | "world";
  assetId: string;
  assetName: string;
  sceneCount: number;
  storyboardCount: number;
  storyboards: AssetUsageStoryboardRef[];
  /** World only — assets linked via worldProfileId */
  characters?: AssetUsageWorldMemberRef[];
  props?: AssetUsageWorldMemberRef[];
  locations?: AssetUsageWorldMemberRef[];
};

export type StoryboardRelationshipScene = {
  sceneId: string;
  order: number;
  title: string;
  location: { id: string; name: string; href: string } | null;
  characters: Array<{ id: string; name: string; href: string }>;
  props: Array<{ id: string; name: string; href: string }>;
  hasGeneratedImage: boolean;
};

export type StoryboardRelationshipsReport = {
  storyboardId: string;
  storyboardTitle: string;
  sceneCount: number;
  worldProfiles: Array<{ id: string; name: string; href: string }>;
  voices: Array<{ language: string; status: string }>;
  scenes: StoryboardRelationshipScene[];
};
