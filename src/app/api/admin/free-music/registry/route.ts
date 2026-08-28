import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { loadFreeMusicRegistry } from "@/lib/free-music/registry";
import { admitTrack } from "@/lib/free-music/admit-track";

export const dynamic = "force-dynamic";

/** Internal curation read model — admin only. */
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const tracks = loadFreeMusicRegistry().map((t) => ({
    trackId: t.trackId,
    title: t.title,
    artist: t.artist,
    sourceName: t.sourceName,
    sourceTrackUrl: t.sourceTrackUrl,
    licenseClass: t.licenseClass,
    licenseType: t.licenseType,
    rightsReviewStatus: t.rightsReviewStatus,
    catalogStatus: t.catalogStatus,
    contentIdRisk: t.contentIdRisk,
    sourceFileHash: t.sourceFileHash,
    storedMasterHash: t.storedMasterHash,
    category: t.category,
    reviewedBy: t.reviewedBy,
    reviewedAt: t.reviewedAt,
    admission: admitTrack(t),
  }));

  return NextResponse.json({ tracks });
}
