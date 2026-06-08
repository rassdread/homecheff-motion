import { NextResponse } from "next/server";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";
import { listUserGeneratedReferences } from "@/server/studio/list-user-generated-references";

export async function GET(req: Request) {
  const viewer = await requireActiveUser();
  if (viewer instanceof NextResponse) {
    return viewer;
  }
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const userId = url.searchParams.get("userId");

  const targetUserId =
    userId && canAccessAdmin(viewer) && userId !== viewer.id ? userId : viewer.id;

  const items = await listUserGeneratedReferences({ userId: targetUserId, limit });
  const isAdmin = canAccessAdmin(viewer);

  return NextResponse.json({
    ok: true,
    data: {
      items: items.map((item) => ({
        ...item,
        costEventId: isAdmin ? item.costEventId : undefined,
        provider: isAdmin ? item.provider : undefined,
        referenceStorageKey: isAdmin ? item.referenceStorageKey : undefined,
      })),
    },
  });
}
