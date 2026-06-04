import type { SessionUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/auth/permissions";

export type PropOwnerRow = {
  ownerId: string;
};

export function studioPropViewerCanView(
  viewer: Pick<SessionUser, "id" | "role">,
  prop: PropOwnerRow
): boolean {
  return prop.ownerId === viewer.id || canAccessAdmin(viewer);
}

export function studioPropViewerCanModify(
  viewer: Pick<SessionUser, "id">,
  prop: PropOwnerRow
): boolean {
  return prop.ownerId === viewer.id;
}
