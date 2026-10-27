import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { listStudioHistoryForOwner } from "@/server/studio/studio-v24-history";

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "24");
  const items = await listStudioHistoryForOwner(user.id, Number.isFinite(limit) ? limit : 24);
  return NextResponse.json({ items });
}
