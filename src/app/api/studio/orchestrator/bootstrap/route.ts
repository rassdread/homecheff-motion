import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { bootstrapStoryboardFromOrchestrator } from "@/server/studio/studio-orchestrator-bootstrap";
import type { HcOrchestratorState } from "@/types/studio-video-production";
import { isStudioVideoIntent } from "@/lib/studio-video-intents";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    orchestrator?: HcOrchestratorState;
    idea?: string;
    characterId?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orchestrator = body.orchestrator;
  if (!orchestrator?.intent || !isStudioVideoIntent(orchestrator.intent)) {
    return NextResponse.json({ error: "Invalid orchestrator state" }, { status: 400 });
  }

  const result = await bootstrapStoryboardFromOrchestrator({
    viewer: user,
    orchestrator,
    idea: body.idea,
    characterId: body.characterId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    storyboardId: result.storyboardId,
    sceneCount: result.sceneCount,
    title: result.title,
    motionImportPath: `/animate/instant/import?storyboardId=${encodeURIComponent(result.storyboardId)}&autoImport=1`,
  });
}
