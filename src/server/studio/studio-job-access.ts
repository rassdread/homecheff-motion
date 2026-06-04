import type { SessionUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/auth/permissions";

export type StudioJobOwnerRow = {
  ownerId: string;
};

export function studioJobViewerCanView(
  viewer: Pick<SessionUser, "id" | "role">,
  job: StudioJobOwnerRow
): boolean {
  return job.ownerId === viewer.id || canAccessAdmin(viewer);
}
