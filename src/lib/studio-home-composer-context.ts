/**
 * Live homepage composer snapshot for the contextual side panel.
 * This is the same draft the composer already keeps. It is not a second assistant.
 */

import { publishStudioFilmAssistantContext } from "@/lib/studio-film-assistant-bridge";
import {
  STUDIO_AI_HOME_PLAN_PROJECT_KEY,
  STUDIO_AI_HOME_PLAN_STORAGE_KEY,
} from "@/lib/studio-ai-home-intent";

export const STUDIO_HOME_DRAFT_KEY = "hc_studio_ai_home_draft";

export type StudioHomeComposerAttachment = {
  kind: "media" | "character" | "product" | "brand";
  id: string;
  name: string;
};

export type StudioHomeComposerSnapshot = {
  prompt: string;
  attachments: StudioHomeComposerAttachment[];
};

const EMPTY: StudioHomeComposerSnapshot = { prompt: "", attachments: [] };

let current: StudioHomeComposerSnapshot = EMPTY;
const listeners = new Set<() => void>();

export function publishStudioHomeComposerContext(value: StudioHomeComposerSnapshot): void {
  current = {
    prompt: value.prompt,
    attachments: value.attachments.map((item) => ({ ...item })),
  };
  for (const listener of listeners) listener();
}

export function readStudioHomeComposerContext(): StudioHomeComposerSnapshot {
  return current;
}

export function getStudioHomeComposerServerSnapshot(): StudioHomeComposerSnapshot {
  return EMPTY;
}

export function subscribeStudioHomeComposerContext(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const promptRequests = new Set<(prompt: string) => void>();

/** Send a suggestion into the one homepage composer. Does not start a second chat. */
export function requestStudioHomeComposerPrompt(prompt: string): void {
  const next = prompt.trim();
  if (!next) return;
  for (const listener of promptRequests) listener(next);
}

export function subscribeStudioHomeComposerPrompt(listener: (prompt: string) => void): () => void {
  promptRequests.add(listener);
  return () => promptRequests.delete(listener);
}

/** Drop private creative context kept in this browser tab. */
export function clearStudioPrivateClientContext(): void {
  publishStudioHomeComposerContext(EMPTY);
  publishStudioFilmAssistantContext(null);
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STUDIO_HOME_DRAFT_KEY);
    sessionStorage.removeItem(STUDIO_AI_HOME_PLAN_STORAGE_KEY);
    sessionStorage.removeItem(STUDIO_AI_HOME_PLAN_PROJECT_KEY);
  } catch {
    /* ignore */
  }
}
