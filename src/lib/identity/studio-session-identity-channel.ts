/**
 * Cross-tab auth identity coordination for Studio.
 * Ecosystem convention: BroadcastChannel = `homecheff-{product}-auth`.
 * Never trust channel payload for authorization — always re-fetch /api/auth/session.
 */

export const STUDIO_AUTH_CHANNEL = "homecheff-studio-auth";
export const STUDIO_AUTH_USER_STORAGE_KEY = "studio_auth_user_id";

export type StudioAuthChannelMessage =
  | { type: "logout" }
  | { type: "login"; userId: string }
  | { type: "identity"; userId: string | null };

export function postStudioAuthChannel(message: StudioAuthChannelMessage): void {
  if (typeof window === "undefined") return;
  try {
    const bc = new BroadcastChannel(STUDIO_AUTH_CHANNEL);
    bc.postMessage(message);
    bc.close();
  } catch {
    /* unavailable */
  }
}

export function rememberStudioAuthUserId(userId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (userId) sessionStorage.setItem(STUDIO_AUTH_USER_STORAGE_KEY, userId);
    else sessionStorage.removeItem(STUDIO_AUTH_USER_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

export function readRememberedStudioAuthUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(STUDIO_AUTH_USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Clear identity-bound Studio client residue (keep language prefs). */
export function clearStudioIdentityBoundClientResidue(): void {
  if (typeof window === "undefined") return;
  const lsKeys = [
    "hc-instant-wizard:v1",
    "hc-editor-canvas-sessions-v1",
    "hc-homecheff-projects-v1",
    "hc-assistant-history-v1",
    "hc_editor_user_credits",
    "hc-px4a-draft:v1",
  ];
  try {
    for (const k of lsKeys) localStorage.removeItem(k);
    const extra: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith("hc-editor-library-") ||
        k.startsWith("hc-instant-wizard") ||
        k.startsWith("hc-px4a-draft") ||
        k.startsWith("hc_editor_")
      ) {
        extra.push(k);
      }
    }
    for (const k of extra) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
  try {
    const idbNames = ["hc-instant-wizard-blobs", "hc-px4a-draft-blobs"];
    for (const name of idbNames) {
      try {
        indexedDB.deleteDatabase(name);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}
