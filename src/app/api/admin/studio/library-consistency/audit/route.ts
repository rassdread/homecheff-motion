import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS } from "@/lib/library-consistency";
import { findMissingLibraryAssets } from "@/server/studio/library-consistency-service";
import { listLibraryConsistencyRecords } from "@/server/studio/library-consistency-manifest-blob";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) {
    return admin;
  }

  const url = new URL(request.url);
  const ownerId = url.searchParams.get("ownerId")?.trim() || admin.id;

  const [records, missing] = await Promise.all([
    listLibraryConsistencyRecords(ownerId, 100),
    findMissingLibraryAssets(ownerId),
  ]);

  const audit = LIBRARY_CONSISTENCY_AUDIT_ENDPOINTS.map((entry) => ({
    ...entry,
    recordCount: records.filter((r) => r.generationType === entry.generationType).length,
  }));

  const gaps = missing.map((item) => ({
    asset: item.assetName,
    type: item.generationType,
    project: item.projectTitle ?? item.projectId ?? "—",
    created: item.createdAt,
    storageKey: item.storageKey,
    assetUrl: item.assetUrl,
  }));

  if (gaps.length > 0) {
    console.warn("[library-consistency-audit] missing assets", {
      ownerId,
      count: gaps.length,
      samples: gaps.slice(0, 5),
    });
  }

  return NextResponse.json({
    ok: true,
    audit,
    totalRecords: records.length,
    missingCount: missing.length,
    missing: gaps,
  });
}
