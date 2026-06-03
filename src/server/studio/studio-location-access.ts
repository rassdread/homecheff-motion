import type { SessionUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/auth/permissions";

export type LocationOwnerRow = {
  ownerId: string;
};

export function studioLocationViewerCanView(
  viewer: Pick<SessionUser, "id" | "role">,
  location: LocationOwnerRow
): boolean {
  return location.ownerId === viewer.id || canAccessAdmin(viewer);
}

export function studioLocationViewerCanModify(
  viewer: Pick<SessionUser, "id">,
  location: LocationOwnerRow
): boolean {
  return location.ownerId === viewer.id;
}
