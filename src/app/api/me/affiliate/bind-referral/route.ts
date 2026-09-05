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
    affTrackSlug?: string;
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

  const affTrackSlug = body.affTrackSlug?.trim().toLowerCase();
  if (affTrackSlug) {
    const resolved = await growthFetchJson(
      `/api/internal/ecosystem/affiliate/tracking/resolve?slug=${encodeURIComponent(affTrackSlug)}`,
      {
        method: "GET",
        centralUserId: referredCentralUserId,
      },
    );
    const r = resolved.json as {
      ok?: boolean;
      found?: boolean;
      economicCentralUserId?: string;
      organizationId?: string;
      marketerUserId?: string | null;
      campaignId?: string | null;
      trackingAssetId?: string;
      channel?: string | null;
      campaignCode?: string | null;
      slug?: string;
    } | null;

    if (!resolved.ok || !r?.ok || !r.found || !r.economicCentralUserId || !r.organizationId) {
      return NextResponse.json(
        { ok: false, code: "TRACK_NOT_FOUND" },
        { status: resolved.status || 404 },
      );
    }

    if (r.economicCentralUserId === referredCentralUserId) {
      return NextResponse.json({ ok: false, code: "SELF_REFERRAL" }, { status: 422 });
    }

    const lock = await growthFetchJson("/api/internal/ecosystem/affiliate/attribution/lock", {
      method: "POST",
      centralUserId: referredCentralUserId,
      body: {
        referredCentralUserId,
        affiliateCentralUserId: r.economicCentralUserId,
        sourcePlatform: "STUDIO",
        sourceCampaign: r.campaignCode ?? `company_track:${r.slug || affTrackSlug}`,
        acquisition: {
          organizationId: r.organizationId,
          marketerUserId: r.marketerUserId,
          campaignId: r.campaignId,
          trackingAssetId: r.trackingAssetId,
          channel: r.channel,
          acquisitionMedium: "aff_track_cookie",
          sourceCampaign: r.campaignCode,
        },
      },
    });

    return NextResponse.json(lock.json ?? { ok: false, code: "GROWTH_LOCK_FAILED" }, {
      status: lock.status,
    });
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
