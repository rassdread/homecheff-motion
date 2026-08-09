/**
 * S.6G — Client session for Quick → Professional → Director upgrades.
 * Stores Director answers + handoff refs — never Continuity identity payloads.
 */

import type { CreativeIntentAnswers } from "@/lib/studio-creative-director/creative-planner";
import type { StudioProductExperienceId } from "@/lib/studio-creative-director/product-experience-ids";
import type { StudioProductMode } from "@/lib/studio-creative-director/types";
import type { ConsumerSourceAsset } from "@/lib/studio-creative-director/consumer-entry";

export const CONSUMER_EXPERIENCE_SESSION_KEY = "hc.studio.s6g.experience.v1";

export type ConsumerExperienceSession = {
  version: 1;
  experienceId: StudioProductExperienceId;
  mode: StudioProductMode;
  answers: CreativeIntentAnswers;
  matrixExperienceId: string;
  continuityStrategy: string;
  sourceAsset: ConsumerSourceAsset | null;
  returnTo: string | null;
  updatedAt: number;
};

export function saveConsumerExperienceSession(
  session: ConsumerExperienceSession
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CONSUMER_EXPERIENCE_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota */
  }
}

export function loadConsumerExperienceSession(): ConsumerExperienceSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CONSUMER_EXPERIENCE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsumerExperienceSession;
    if (parsed?.version !== 1 || !parsed.experienceId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearConsumerExperienceSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CONSUMER_EXPERIENCE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function buildDirectorWorkspaceHref(session: ConsumerExperienceSession): string {
  const params = new URLSearchParams({
    experience: session.experienceId,
    mode: "director",
    tool: "creativeDirector",
  });
  return `/studio?${params.toString()}`;
}

export function buildProfessionalExperienceHref(
  session: ConsumerExperienceSession
): string {
  const params = new URLSearchParams({
    experience: session.experienceId,
    mode: "professional",
  });
  return `/studio/experience?${params.toString()}`;
}
