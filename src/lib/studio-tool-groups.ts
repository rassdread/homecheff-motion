/**
 * Studio tool taxonomy for progressive disclosure (S.2).
 * All tools remain reachable; primary strip shows core groups first.
 */

import { STUDIO_TOOL_IDS, type StudioToolId } from "@/lib/studio-tool-id";

export type StudioToolGroupId =
  | "create"
  | "story"
  | "audio"
  | "post"
  | "direct"
  | "more";

export type StudioToolGroup = {
  id: StudioToolGroupId;
  tools: StudioToolId[];
};

/** User mental-model grouping — audited against live StudioToolId set. */
export const STUDIO_TOOL_GROUPS: StudioToolGroup[] = [
  {
    id: "create",
    tools: ["story", "visual", "text"],
  },
  {
    id: "story",
    tools: ["characters", "locations", "props", "world", "consistency", "continuity"],
  },
  {
    id: "audio",
    tools: ["voice", "music", "sound"],
  },
  {
    id: "post",
    tools: ["subtitles", "translate", "render", "export", "versions"],
  },
  {
    id: "direct",
    tools: [
      "production",
      "insights",
      "creationAssistant",
      "creativeReview",
      "storyArchitecture",
      "directorPreferences",
      "productionHistory",
    ],
  },
];

/** Always visible in the compact primary strip (progressive disclosure). */
export const STUDIO_PRIMARY_TOOL_IDS: StudioToolId[] = [
  "story",
  "characters",
  "locations",
  "visual",
  "voice",
  "music",
  "subtitles",
  "render",
  "export",
  "insights",
];

const PRIMARY_SET = new Set(STUDIO_PRIMARY_TOOL_IDS);

export function isStudioPrimaryTool(tool: StudioToolId): boolean {
  return PRIMARY_SET.has(tool);
}

export function studioToolGroupFor(tool: StudioToolId): StudioToolGroupId {
  for (const group of STUDIO_TOOL_GROUPS) {
    if (group.tools.includes(tool)) {
      return group.id;
    }
  }
  return "more";
}

/** Every registered tool appears in exactly one taxonomy group. */
export function assertStudioToolTaxonomyCoverage(): StudioToolId[] {
  const covered = new Set(STUDIO_TOOL_GROUPS.flatMap((g) => g.tools));
  return STUDIO_TOOL_IDS.filter((id) => !covered.has(id));
}
