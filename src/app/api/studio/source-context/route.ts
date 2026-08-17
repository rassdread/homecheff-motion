import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchHomecheffOwnerSourceContext } from "@/lib/studio-px4-homecheff-fetch";
import { isPx4OpaqueId, isPx4SourceType } from "@/lib/studio-px4-source-context";
import { requireActiveUser } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const source = (url.searchParams.get("source") ?? "").trim().toLowerCase();
  const type = (url.searchParams.get("type") ?? "").trim().toLowerCase();
  const id = (url.searchParams.get("id") ?? "").trim();

  if (source && source !== "homecheff") {
    return NextResponse.json({ ok: false, reason: "unresolved" }, { status: 200 });
  }
  if (!isPx4SourceType(type) || !isPx4OpaqueId(id)) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 200 });
  }

  const linked = await prisma.user.findUnique({
    where: { id: user.id },
    select: { centralUserId: true },
  });
  const centralUserId = linked?.centralUserId?.trim() ?? "";
  if (!centralUserId) {
    return NextResponse.json({ ok: false, reason: "unresolved" }, { status: 200 });
  }

  const result = await fetchHomecheffOwnerSourceContext({
    centralUserId,
    sourceType: type,
    sourceId: id,
  });
  return NextResponse.json(result, { status: 200 });
}
