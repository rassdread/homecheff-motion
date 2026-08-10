/**
 * SP.2B.1 — Studio welcome / first-product preferences (client persistence).
 * No schema change — product-only prefs until a later optional column.
 */

export const STUDIO_WELCOME_STORAGE_KEY = "homecheff.studio.welcome.v1";

export type StudioWelcomePreferences = {
  completedAt: string;
  preferredLanguage: "nl" | "en";
  creatorOrBusiness: "creator" | "business" | "both";
  creativeInterests: string[];
  defaultWorkspace: "studio" | "editor" | "motion";
  company?: string;
};

export function readStudioWelcomePreferences(): StudioWelcomePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STUDIO_WELCOME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudioWelcomePreferences;
    if (!parsed?.completedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStudioWelcomePreferences(prefs: StudioWelcomePreferences): void {
  window.localStorage.setItem(STUDIO_WELCOME_STORAGE_KEY, JSON.stringify(prefs));
  document.cookie = `studio_welcome_done=1; Path=/; Max-Age=${60 * 60 * 24 * 400}; SameSite=Lax`;
}

export function hasStudioWelcomeCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return /(?:^|;\s*)studio_welcome_done=1(?:;|$)/.test(cookieHeader);
}
