export type StudioToolId =
  | "story"
  | "characters"
  | "locations"
  | "props"
  | "world"
  | "voice"
  | "music"
  | "sound"
  | "text"
  | "subtitles"
  | "translate"
  | "export";

export const STUDIO_TOOL_IDS: StudioToolId[] = [
  "story",
  "characters",
  "locations",
  "props",
  "world",
  "voice",
  "music",
  "sound",
  "text",
  "subtitles",
  "translate",
  "export",
];

export const STUDIO_ASSET_TOOL_IDS = new Set<StudioToolId>([
  "characters",
  "locations",
  "props",
  "world",
]);

export const STUDIO_PLACEHOLDER_TOOL_IDS = new Set<StudioToolId>([
  "voice",
  "music",
  "sound",
  "text",
  "subtitles",
  "translate",
  "export",
]);

export function studioToolToAssetTab(
  tool: StudioToolId
): "characters" | "locations" | "props" | "worlds" | null {
  switch (tool) {
    case "characters":
      return "characters";
    case "locations":
      return "locations";
    case "props":
      return "props";
    case "world":
      return "worlds";
    default:
      return null;
  }
}
