import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  buildLibraryAssetIndex,
  buildLibraryProjectStatsMap,
  countLibraryRecordsByTab,
  filterLibraryRecordsByTab,
  listAssetsForProjectIndex,
  listCharactersInLibraryIndex,
  listFusionOutputsInLibraryIndex,
  listMotionVideosInLibraryIndex,
  listPublishExportsInLibraryIndex,
  queryLibraryAssetIndex,
  summarizeLibraryAssetIndex,
  type LibraryConsistencyFilterTab,
} from "@/lib/library-asset-index";
import { listLibraryConsistencyRecords } from "@/server/studio/library-consistency-manifest-blob";
import type { LibraryAssetIndexQuery } from "@/lib/library-asset-index";
import type { LibraryGenerationType, LibrarySourceModule } from "@/types/library-consistency";

export const runtime = "nodejs";

type QueryBody = LibraryAssetIndexQuery & {
  preset?: "characters" | "motion_videos" | "fusion_outputs" | "publish_exports" | "project_assets";
  tab?: LibraryConsistencyFilterTab;
  limit?: number;
  includeProjectStats?: boolean;
};

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: QueryBody = {};
  try {
    body = (await request.json()) as QueryBody;
  } catch {
    body = {};
  }

  const limit = Math.min(body.limit ?? 500, 500);
  const records = await listLibraryConsistencyRecords(user.id, limit);

  let scoped = records;
  if (body.tab) {
    scoped = filterLibraryRecordsByTab(records, body.tab, body.projectId);
  }

  const index = buildLibraryAssetIndex(scoped);

  let results = index;
  if (body.preset === "characters") {
    results = listCharactersInLibraryIndex(records);
  } else if (body.preset === "motion_videos") {
    results = listMotionVideosInLibraryIndex(records);
  } else if (body.preset === "fusion_outputs") {
    results = listFusionOutputsInLibraryIndex(records);
  } else if (body.preset === "publish_exports") {
    results = listPublishExportsInLibraryIndex(records);
  } else if (body.preset === "project_assets" && body.projectId) {
    results = listAssetsForProjectIndex(records, body.projectId);
  } else {
    results = queryLibraryAssetIndex(scoped, {
      projectId: body.projectId,
      generationType: body.generationType as LibraryGenerationType | undefined,
      category: body.category,
      sourceModule: body.sourceModule as LibrarySourceModule | undefined,
      workflow: body.workflow,
      motionReady: body.motionReady,
      characterType: body.characterType,
      fusionArchetype: body.fusionArchetype,
      fusionIntent: body.fusionIntent,
      textSearch: body.textSearch,
      limit,
    });
  }

  return NextResponse.json({
    ok: true,
    stats: summarizeLibraryAssetIndex(records),
    tabCounts: countLibraryRecordsByTab(records, body.projectId),
    projectStats: body.includeProjectStats === false ? undefined : buildLibraryProjectStatsMap(records),
    results,
  });
}
