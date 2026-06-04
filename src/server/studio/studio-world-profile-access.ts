import type { StudioWorldProfile } from "@prisma/client";
import type { SessionUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/auth/permissions";

export function studioWorldProfileViewerCanView(
  viewer: Pick<SessionUser, "id" | "role">,
  row: Pick<StudioWorldProfile, "ownerId">
): boolean {
  return canAccessAdmin(viewer) || row.ownerId === viewer.id;
}

export function studioWorldProfileViewerCanModify(
  viewer: Pick<SessionUser, "id" | "role">,
  row: Pick<StudioWorldProfile, "ownerId">
): boolean {
  return row.ownerId === viewer.id;
}
