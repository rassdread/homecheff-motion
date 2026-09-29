import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * Whether this signed-in Studio user is already an ecosystem affiliate.
 * Proxies the existing Growth access check. Does not activate anyone.
 */
export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return NextResponse.json({ loggedIn: false, dashboardAccess: false });
  }

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { centralUserId: true },
  });
  const centralUserId = row?.centralUserId?.trim();
  if (!centralUserId) {
    return NextResponse.json({ loggedIn: true, dashboardAccess: false });
  }

  const origin = process.env.HOMECHEFF_GROWTH_ORIGIN?.trim() || "https://growth.homecheff.eu";
  const secret =
    process.env.STUDIO_HC_INTERNAL_SECRET?.trim() ||
    process.env.HC_INTERNAL_PROBE_SECRET?.trim() ||
    "";
  if (!secret) {
    return NextResponse.json({ loggedIn: true, known: false, code: "UNCONFIGURED" }, { status: 503 });
  }

  const res = await fetch(`${origin}/api/internal/ecosystem/affiliate/access`, {
    headers: {
      "x-studio-hc-internal-secret": secret,
      "x-studio-central-user-id": centralUserId,
      "x-ecosystem-affiliate-central-user-id": centralUserId,
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { dashboardAccess?: boolean } | null;
  if (!res.ok || !json || typeof json.dashboardAccess !== "boolean") {
    return NextResponse.json({ loggedIn: true, known: false }, { status: 502 });
  }
  return NextResponse.json({
    loggedIn: true,
    dashboardAccess: json.dashboardAccess,
  });
}
