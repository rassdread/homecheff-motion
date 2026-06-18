export type StudioCopilotPlacement = "side" | "wide" | "dock" | "focus";

export type StudioCopilotLayoutPreferences = {
  placement: StudioCopilotPlacement;
  width: number;
  collapsedRecent: boolean;
  compactMode: boolean;
};

export const STUDIO_COPILOT_LAYOUT_STORAGE_KEY = "homecheff:studio-copilot-layout";

export const STUDIO_COPILOT_WIDTH_DEFAULT = 440;
export const STUDIO_COPILOT_WIDTH_MIN = 340;
export const STUDIO_COPILOT_WIDTH_MAX = 620;
export const STUDIO_COPILOT_WIDTH_WIDE = 520;
export const STUDIO_COPILOT_WIDTH_FOCUS = 600;

export const DEFAULT_STUDIO_COPILOT_LAYOUT: StudioCopilotLayoutPreferences = {
  placement: "side",
  width: STUDIO_COPILOT_WIDTH_DEFAULT,
  collapsedRecent: true,
  compactMode: true,
};
