/**
 * Canonical Studio creative vocabulary + workflow stages (S.3).
 */

export const STUDIO_CREATIVE_STAGES = [
  "idea",
  "setup",
  "build",
  "edit",
  "preview",
  "render",
  "export",
] as const;

export type StudioCreativeStage = (typeof STUDIO_CREATIVE_STAGES)[number];

/** User-facing term → meaning (product copy should prefer the left column). */
export const STUDIO_VOCABULARY = {
  project: "A user creative project (UI). Internally often a storyboard record.",
  storyboard: "Server entity for the project narrative + scenes.",
  scene: "Ordered building block with visual, duration, text, voice, audio.",
  asset: "Reusable character, location, prop, world, or media item.",
  generate: "Create media/content with AI (may cost credits).",
  render: "Produce a video output via Motion / render pipeline.",
  export: "Download or deliver a finished result.",
  voice: "Narration / character speech assigned to project or scene.",
  subtitle: "Timed caption track for the project.",
  timeline: "Ordered scenes (list/navigator in workspace; NLE only in advanced).",
} as const;

export function inferStudioCreativeStage(input: {
  hasScenes: boolean;
  activeTool: string;
  /** True when user entered via idea/orchestrator without scenes yet. */
  hasIdeaBrief?: boolean;
}): StudioCreativeStage {
  if (!input.hasScenes) {
    if (input.hasIdeaBrief) {
      return "idea";
    }
    return "setup";
  }
  switch (input.activeTool) {
    case "story":
      return "build";
    case "render":
    case "versions":
      return "render";
    case "export":
    case "translate":
      return "export";
    case "production":
    case "storyArchitecture":
    case "directorPreferences":
    case "creativeDirector":
      return "setup";
    case "insights":
    case "creativeReview":
      return "preview";
    default:
      return "edit";
  }
}
