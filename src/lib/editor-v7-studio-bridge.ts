import type { EditorV7CommandActionType } from "@/types/homecheff-visual-editor";

export type EditorV7StudioBridgeAction = {
  actionType: EditorV7CommandActionType;
  studioPath?: string;
  exportProfile?: "motion_ready" | "print_ready" | "social";
  workspaceMode?: "export" | "quick_motion";
};

const STUDIO_BRIDGE_MAP: Array<{
  terms: string[];
  action: EditorV7StudioBridgeAction;
}> = [
  {
    terms: ["motion-ready", "motion ready", "prepare for motion"],
    action: {
      actionType: "motion_ready",
      exportProfile: "motion_ready",
      workspaceMode: "export",
    },
  },
  {
    terms: ["5-scene", "storyboard", "create a story", "studio workflow"],
    action: {
      actionType: "studio_story",
      studioPath: "/studio/storyboards/new",
    },
  },
  {
    terms: ["publish to social", "publish social", "social export"],
    action: {
      actionType: "publish_social",
      exportProfile: "social",
      workspaceMode: "export",
    },
  },
];

export function resolveStudioBridgeAction(prompt: string): EditorV7StudioBridgeAction | null {
  const lower = prompt.toLowerCase();
  for (const entry of STUDIO_BRIDGE_MAP) {
    if (entry.terms.some((term) => lower.includes(term))) {
      return entry.action;
    }
  }
  return null;
}

export function studioBridgeLabelKey(actionType: EditorV7CommandActionType): string {
  switch (actionType) {
    case "motion_ready":
      return "editor.v7.studio.motionReady";
    case "studio_story":
      return "editor.v7.studio.story";
    case "publish_social":
      return "editor.v7.studio.publish";
    default:
      return "editor.v7.studio.generic";
  }
}
