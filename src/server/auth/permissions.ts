import { NextResponse } from "next/server";
import type { AnimationPresetId } from "@/lib/animation-presets";
import {
  getAdvancedAnimationLimitsForRole,
  type AdvancedAnimationLimits,
} from "@/lib/animation-advanced-settings";
import { getUsageLimitsForRole } from "@/server/animations/usage-limits";
import { getAuthenticatedUser, type SessionUser } from "@/server/auth/session";

export const USER_ROLES = ["admin", "power", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const INVITE_ROLES = ["admin", "power", "user"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

export function normalizeUserRole(role: string): UserRole {
  if (role === "admin" || role === "power") {
    return role;
  }
  return "user";
}

export function normalizeInviteRole(role: string): InviteRole {
  return normalizeUserRole(role) as InviteRole;
}

export function canAccessAdmin(user: Pick<SessionUser, "role">): boolean {
  return user.role === "admin";
}

/** Presets a user may select and create projects with (server source of truth). */
export function getAllowedPresetIdsForUser(user: Pick<SessionUser, "role">): AnimationPresetId[] {
  const r = normalizeUserRole(user.role);
  if (r === "admin") {
    return ["basic", "standard", "smooth", "pro"];
  }
  if (r === "power") {
    return ["basic", "standard", "smooth", "pro"];
  }
  return ["basic", "standard"];
}

export function canUsePreset(
  user: Pick<SessionUser, "role">,
  presetId: string
): presetId is AnimationPresetId {
  return getAllowedPresetIdsForUser(user).includes(presetId as AnimationPresetId);
}

/** Admin always; power/user false until product enables safe advanced for power. */
export function canUseAdvancedAnimationControls(user: Pick<SessionUser, "role">): boolean {
  return getAdvancedAnimationLimitsForUser(user).advancedControls;
}

export function getAdvancedAnimationLimitsForUser(
  user: Pick<SessionUser, "role">
): AdvancedAnimationLimits {
  return getAdvancedAnimationLimitsForRole(normalizeUserRole(user.role));
}

export function getUsageLimitsForUser(user: Pick<SessionUser, "role">) {
  return getUsageLimitsForRole(user.role);
}

export function assertUserActive(
  user: Pick<SessionUser, "isActive">
): { ok: true } | { ok: false; code: "USER_INACTIVE" } {
  if (user.isActive === false) {
    return { ok: false, code: "USER_INACTIVE" };
  }
  return { ok: true };
}

/**
 * Loads the current session user or returns a 401 JSON response.
 * Use in API routes: `const gate = await requireUser(); if (gate instanceof NextResponse) return gate;`
 */
export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required.", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) {
    return user;
  }
  if (!canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden.", code: "FORBIDDEN" }, { status: 403 });
  }
  return user;
}

/** Authenticated user that is allowed to use the app (not disabled). */
export async function requireActiveUser(): Promise<SessionUser | NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) {
    return user;
  }
  const gate = assertUserActive(user);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Account is disabled.", code: "USER_INACTIVE" },
      { status: 403 }
    );
  }
  return user;
}
