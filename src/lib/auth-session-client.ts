/**
 * Client-only: dedupe concurrent `/api/auth/session` fetches and cache briefly
 * so AppShell + hooks share one round-trip per navigation burst.
 */

import type { AnimationPresetId } from "@/lib/animation-presets";

export type AuthSessionApiPayload = {
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
  } | null;
  allowedPresets?: AnimationPresetId[];
  canUseAdvancedAnimationControls?: boolean;
  advancedLimits?: {
    advancedControls: boolean;
    maxDurationSeconds: number;
    maxImages: number;
    maxTransitions: number;
    allowedResolutions: string[];
    allowedModels: string[];
  };
};

const CACHE_MS = 5000;

let inflight: Promise<AuthSessionApiPayload> | null = null;
let cache: { at: number; data: AuthSessionApiPayload } | null = null;

export function invalidateAuthSessionCache(): void {
  cache = null;
  inflight = null;
}

export async function fetchAuthSessionJson(options?: {
  force?: boolean;
}): Promise<AuthSessionApiPayload> {
  const force = options?.force ?? false;
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_MS) {
    return cache.data;
  }
  if (inflight) {
    return inflight;
  }
  inflight = (async () => {
    const res = await fetch("/api/auth/session", { credentials: "same-origin" });
    const data = (await res.json()) as AuthSessionApiPayload;
    cache = { at: Date.now(), data };
    return data;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
