import {
  DEFAULT_STUDIO_COPILOT_LAYOUT,
  defaultWidthForCopilotPlacement,
  STUDIO_COPILOT_LAYOUT_STORAGE_KEY,
  STUDIO_COPILOT_WIDTH_FOCUS,
  STUDIO_COPILOT_WIDTH_MAX,
  STUDIO_COPILOT_WIDTH_MIN,
  STUDIO_COPILOT_WIDTH_WIDE,
  type StudioCopilotLayoutPreferences,
  type StudioCopilotPlacement,
} from "@/types/studio-copilot-layout";
import { shallowRecordEqual } from "@/lib/external-store-snapshot";
import { normalizeAssistantRoutePathname } from "@/lib/homecheff-assistant-flag";

let memoryLayoutStore: string | null = null;

const layoutListeners = new Set<() => void>();

/** Stable snapshot for useSyncExternalStore — must not allocate new objects per read. */
let cachedLayoutRaw: string | null | undefined = undefined;
let cachedLayoutSnapshot: StudioCopilotLayoutPreferences = DEFAULT_STUDIO_COPILOT_LAYOUT;

function notifyLayoutListeners(): void {
  for (const listener of layoutListeners) {
    listener();
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hc-studio-copilot-layout-updated"));
  }
}

export function subscribeStudioCopilotLayout(onStoreChange: () => void): () => void {
  layoutListeners.add(onStoreChange);
  return () => {
    layoutListeners.delete(onStoreChange);
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

function parseLayoutFromRaw(raw: string | null): StudioCopilotLayoutPreferences {
  if (!raw) {
    return DEFAULT_STUDIO_COPILOT_LAYOUT;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StudioCopilotLayoutPreferences>;
    const placement = parsed.placement ?? DEFAULT_STUDIO_COPILOT_LAYOUT.placement;
    const width =
      typeof parsed.width === "number"
        ? clampWidth(parsed.width)
        : defaultWidthForCopilotPlacement(placement);
    return {
      placement,
      width,
      collapsedRecent: parsed.collapsedRecent ?? DEFAULT_STUDIO_COPILOT_LAYOUT.collapsedRecent,
      compactMode: parsed.compactMode ?? DEFAULT_STUDIO_COPILOT_LAYOUT.compactMode,
      collapsed: parsed.collapsed ?? DEFAULT_STUDIO_COPILOT_LAYOUT.collapsed,
      restorePlacement: parsed.restorePlacement ?? placement ?? DEFAULT_STUDIO_COPILOT_LAYOUT.restorePlacement,
    };
  } catch {
    return DEFAULT_STUDIO_COPILOT_LAYOUT;
  }
}

function readLayoutRaw(): string | null {
  if (typeof window === "undefined") {
    return memoryLayoutStore;
  }
  try {
    return window.localStorage.getItem(STUDIO_COPILOT_LAYOUT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readStudioCopilotLayout(): StudioCopilotLayoutPreferences {
  const raw = readLayoutRaw();
  if (raw === cachedLayoutRaw) {
    return cachedLayoutSnapshot;
  }
  cachedLayoutRaw = raw;
  const parsed = parseLayoutFromRaw(raw);
  if (shallowRecordEqual(parsed, cachedLayoutSnapshot)) {
    return cachedLayoutSnapshot;
  }
  cachedLayoutSnapshot = parsed;
  return cachedLayoutSnapshot;
}

export function writeStudioCopilotLayout(
  prefs: Partial<StudioCopilotLayoutPreferences> & Pick<StudioCopilotLayoutPreferences, "placement">
): StudioCopilotLayoutPreferences {
  const base = cachedLayoutSnapshot;
  const placement = prefs.placement;
  const normalized: StudioCopilotLayoutPreferences = {
    placement,
    width:
      prefs.width !== undefined
        ? resolveWidthForPlacement(placement, prefs.width)
        : defaultWidthForCopilotPlacement(placement),
    collapsedRecent: prefs.collapsedRecent ?? base.collapsedRecent,
    compactMode: prefs.compactMode ?? base.compactMode,
    collapsed: prefs.collapsed ?? base.collapsed,
    restorePlacement: prefs.restorePlacement ?? base.restorePlacement ?? placement,
  };

  if (shallowRecordEqual(normalized, cachedLayoutSnapshot)) {
    return cachedLayoutSnapshot;
  }

  const serialized = JSON.stringify(normalized);
  cachedLayoutRaw = serialized;
  cachedLayoutSnapshot = normalized;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STUDIO_COPILOT_LAYOUT_STORAGE_KEY, serialized);
    } catch {
      // ignore quota
    }
  } else {
    memoryLayoutStore = serialized;
  }
  notifyLayoutListeners();
  return cachedLayoutSnapshot;
}

export function patchStudioCopilotLayout(
  patch: Partial<StudioCopilotLayoutPreferences>
): StudioCopilotLayoutPreferences {
  const current = readStudioCopilotLayout();
  const next: StudioCopilotLayoutPreferences = {
    ...current,
    ...patch,
  };

  if (patch.placement !== undefined && patch.width === undefined) {
    next.width = defaultWidthForCopilotPlacement(patch.placement);
  }

  if (patch.collapsed === true && patch.restorePlacement === undefined) {
    next.restorePlacement = current.placement;
  }

  if (patch.collapsed === false && patch.placement === undefined && current.restorePlacement) {
    next.placement = current.restorePlacement;
    next.width = defaultWidthForCopilotPlacement(next.placement);
  }

  return writeStudioCopilotLayout(next);
}

/**
 * Routes where EditorCanvasWorkspace exposes the dock slot (/editor/start).
 * Other /editor/* paths (landing, fuse redirect) do not mount the dock.
 */
export function isEditorCopilotDockRoute(pathname: string): boolean {
  const path = normalizeAssistantRoutePathname(pathname);
  return path === "/editor/start" || path.startsWith("/editor/start/");
}

export function isDockPlacementSupported(pathname: string): boolean {
  return isEditorCopilotDockRoute(pathname);
}

export function resolveRestorePlacement(
  restorePlacement: StudioCopilotPlacement | undefined,
  pathname: string
): StudioCopilotPlacement {
  const target = restorePlacement ?? "side";
  if (target === "dock" && !isDockPlacementSupported(pathname)) {
    return "side";
  }
  return target;
}

export function shouldHideSideCopilotOnEditor(placement: StudioCopilotPlacement, pathname: string): boolean {
  return placement === "dock" && isDockPlacementSupported(pathname);
}

export function shouldShowSideCopilotPanel(
  layout: StudioCopilotLayoutPreferences,
  pathname: string
): boolean {
  if (layout.collapsed) {
    return false;
  }
  if (shouldHideSideCopilotOnEditor(layout.placement, pathname)) {
    return false;
  }
  return true;
}

export function shouldShowCopilotDock(
  layout: StudioCopilotLayoutPreferences,
  pathname: string
): boolean {
  if (layout.collapsed) {
    return false;
  }
  return layout.placement === "dock" && isDockPlacementSupported(pathname);
}

/** Test helper — reset cached snapshot between tests. */
export function resetStudioCopilotLayoutCacheForTests(): void {
  cachedLayoutRaw = undefined;
  cachedLayoutSnapshot = DEFAULT_STUDIO_COPILOT_LAYOUT;
  memoryLayoutStore = null;
}
