import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { prisma } from "@/lib/prisma";
import { growthFetchJson } from "@/lib/affiliate/growth-ecosystem-affiliate-client";

export async function POST(req: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  let body: {
    affiliateCentralUserId?: string;
    affiliateSlug?: string;
    sourceCampaign?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON" }, { status: 400 });
  }

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { centralUserId: true },
  });
  const referredCentralUserId = row?.centralUserId?.trim();
  if (!referredCentralUserId) {
    return NextResponse.json({ ok: false, code: "NO_CENTRAL_IDENTITY" }, { status: 422 });
  }

  const res = await growthFetchJson("/api/internal/ecosystem/affiliate/attribution/lock", {
    method: "POST",
    centralUserId: referredCentralUserId,
    body: {
      referredCentralUserId,
      affiliateCentralUserId: body.affiliateCentralUserId,
      affiliateSlug: body.affiliateSlug,
      sourcePlatform: "STUDIO",
      sourceCampaign: body.sourceCampaign ?? "studio_ref_cookie",
    },
  });

  return NextResponse.json(res.json ?? { ok: false, code: "GROWTH_LOCK_FAILED" }, {
    status: res.status,
  });
}
