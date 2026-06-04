import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { analyzeAndPersistSceneImage } from "@/server/studio/studio-consistency-service";
import type { SceneConsistencyReport } from "@/types/studio-consistency";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

type RouteContext = {
  params: Promise<{ id: string; sceneId: string; imageId: string }>;
};

export type StudioSceneConsistencyAnalyzeResponse = {
  image: StudioSceneImageListItem;
  report: SceneConsistencyReport;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id, sceneId, imageId } = await context.params;
  const result = await analyzeAndPersistSceneImage(id, sceneId, imageId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: StudioSceneConsistencyAnalyzeResponse = {
    image: result.image,
    report: result.report,
  };
  return NextResponse.json(body, { status: 200 });
}
