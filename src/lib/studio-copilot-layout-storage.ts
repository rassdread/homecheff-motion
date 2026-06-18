import {
  DEFAULT_STUDIO_COPILOT_LAYOUT,
  STUDIO_COPILOT_LAYOUT_STORAGE_KEY,
  STUDIO_COPILOT_WIDTH_FOCUS,
  STUDIO_COPILOT_WIDTH_MAX,
  STUDIO_COPILOT_WIDTH_MIN,
  STUDIO_COPILOT_WIDTH_WIDE,
  type StudioCopilotLayoutPreferences,
  type StudioCopilotPlacement,
} from "@/types/studio-copilot-layout";

let memoryLayoutStore: string | null = null;

const layoutListeners = new Set<() => void>();

function notifyLayoutListeners(): void {
  for (const listener of layoutListeners) {
    listener();
  }
}

export function subscribeStudioCopilotLayout(onStoreChange: () => void): () => void {
  layoutListeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    window.addEventListener("hc-studio-copilot-layout-updated", onStoreChange);
  }
  return () => {
    layoutListeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("hc-studio-copilot-layout-updated", onStoreChange);
    }
  };
}

function clampWidth(width: number): number {
  return Math.min(STUDIO_COPILOT_WIDTH_MAX, Math.max(STUDIO_COPILOT_WIDTH_MIN, Math.round(width)));
}

export function resolveWidthForPlacement(
  placement: StudioCopilotPlacement,
  width: number
): number {
  if (placement === "wide") {
    return clampWidth(Math.max(width, STUDIO_COPILOT_WIDTH_WIDE));
  }
  if (placement === "focus") {
    return clampWidth(Math.max(width, STUDIO_COPILOT_WIDTH_FOCUS));
  }
  return clampWidth(width);
}

export function readStudioCopilotLayout(): StudioCopilotLayoutPreferences {
  if (typeof window === "undefined") {
    if (!memoryLayoutStore) {
      return DEFAULT_STUDIO_COPILOT_LAYOUT;
    }
    try {
      const parsed = JSON.parse(memoryLayoutStore) as Partial<StudioCopilotLayoutPreferences>;
      const placement = parsed.placement ?? DEFAULT_STUDIO_COPILOT_LAYOUT.placement;
      return {
        placement,
        width: resolveWidthForPlacement(placement, parsed.width ?? DEFAULT_STUDIO_COPILOT_LAYOUT.width),
        collapsedRecent: parsed.collapsedRecent ?? DEFAULT_STUDIO_COPILOT_LAYOUT.collapsedRecent,
        compactMode: parsed.compactMode ?? DEFAULT_STUDIO_COPILOT_LAYOUT.compactMode,
      };
    } catch {
      return DEFAULT_STUDIO_COPILOT_LAYOUT;
    }
  }
  try {
    const raw = window.localStorage.getItem(STUDIO_COPILOT_LAYOUT_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STUDIO_COPILOT_LAYOUT;
    }
    const parsed = JSON.parse(raw) as Partial<StudioCopilotLayoutPreferences>;
    const placement = parsed.placement ?? DEFAULT_STUDIO_COPILOT_LAYOUT.placement;
    return {
      placement,
      width: resolveWidthForPlacement(placement, parsed.width ?? DEFAULT_STUDIO_COPILOT_LAYOUT.width),
      collapsedRecent: parsed.collapsedRecent ?? DEFAULT_STUDIO_COPILOT_LAYOUT.collapsedRecent,
      compactMode: parsed.compactMode ?? DEFAULT_STUDIO_COPILOT_LAYOUT.compactMode,
    };
  } catch {
    return DEFAULT_STUDIO_COPILOT_LAYOUT;
  }
}

export function writeStudioCopilotLayout(prefs: StudioCopilotLayoutPreferences): StudioCopilotLayoutPreferences {
  const normalized: StudioCopilotLayoutPreferences = {
    placement: prefs.placement,
    width: resolveWidthForPlacement(prefs.placement, prefs.width),
    collapsedRecent: prefs.collapsedRecent,
    compactMode: prefs.compactMode,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STUDIO_COPILOT_LAYOUT_STORAGE_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent("hc-studio-copilot-layout-updated"));
    } catch {
      // ignore quota
    }
  } else {
    memoryLayoutStore = JSON.stringify(normalized);
    notifyLayoutListeners();
  }
  return normalized;
}

export function patchStudioCopilotLayout(
  patch: Partial<StudioCopilotLayoutPreferences>
): StudioCopilotLayoutPreferences {
  const current = readStudioCopilotLayout();
  const next: StudioCopilotLayoutPreferences = {
    ...current,
    ...patch,
  };
  if (patch.placement && !patch.width) {
    next.width = resolveWidthForPlacement(patch.placement, current.width);
  }
  return writeStudioCopilotLayout(next);
}

export function shouldHideSideCopilotOnEditor(placement: StudioCopilotPlacement, pathname: string): boolean {
  return placement === "dock" && pathname.startsWith("/editor");
}
