import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { centralUserId: true },
  });
  const centralUserId = row?.centralUserId?.trim();
  if (!centralUserId) {
    return NextResponse.json({ ok: false, code: "NO_CENTRAL_IDENTITY" }, { status: 422 });
  }

  const origin = process.env.HOMECHEFF_GROWTH_ORIGIN?.trim() || "https://growth.homecheff.eu";
  const secret =
    process.env.STUDIO_HC_INTERNAL_SECRET?.trim() ||
    process.env.HC_INTERNAL_PROBE_SECRET?.trim() ||
    "";
  const url = new URL(req.url);
  const source = url.searchParams.get("source") ?? "studio";

  const growthUrl = `${origin}/api/ecosystem/affiliate/dashboard?source=${encodeURIComponent(source)}`;
  const res = await fetch(growthUrl, {
    headers: {
      "x-studio-hc-internal-secret": secret,
      "x-studio-central-user-id": centralUserId,
      "x-ecosystem-affiliate-central-user-id": centralUserId,
    },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({ ok: false, code: "GROWTH_DASHBOARD_FAILED" }));
  return NextResponse.json(json, { status: res.status });
}
