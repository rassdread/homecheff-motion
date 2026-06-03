import type { SessionUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/auth/permissions";

export type CharacterOwnerRow = {
  ownerId: string;
};

export function studioCharacterViewerCanView(
  viewer: Pick<SessionUser, "id" | "role">,
  character: CharacterOwnerRow
): boolean {
  return character.ownerId === viewer.id || canAccessAdmin(viewer);
}

/** Only the owner may edit or delete (admins may view all, not mutate others' assets). */
export function studioCharacterViewerCanModify(
  viewer: Pick<SessionUser, "id">,
  character: CharacterOwnerRow
): boolean {
  return character.ownerId === viewer.id;
}
