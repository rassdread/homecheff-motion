/**
 * Session prefill for Identity Builder when user chooses "Build new".
 */

import type { AssetDecisionKind, IdentityBuilderPrefill } from "@/types/studio-asset-decision";
import { IDENTITY_PREFILL_KEY } from "@/lib/studio-asset-decision-storage";

export function storeIdentityBuilderPrefill(prefill: IdentityBuilderPrefill): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(IDENTITY_PREFILL_KEY, JSON.stringify(prefill));
  } catch {
    /* ignore */
  }
}

export function loadIdentityBuilderPrefill(): IdentityBuilderPrefill | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(IDENTITY_PREFILL_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as IdentityBuilderPrefill;
    if (parsed.version !== 1) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearIdentityBuilderPrefill(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(IDENTITY_PREFILL_KEY);
  } catch {
    /* ignore */
  }
}

export function identityBuilderHref(kind: AssetDecisionKind, decisionId: string): string {
  const base =
    kind === "character" ? "/studio/characters/new"
    : kind === "location" ? "/studio/locations/new"
    : kind === "world" ? "/studio/worlds/new"
    : "/studio/props/new";
  return `${base}?decisionId=${encodeURIComponent(decisionId)}`;
}
