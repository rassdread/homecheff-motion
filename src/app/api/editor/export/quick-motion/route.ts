import { NextResponse } from "next/server";
import { planQuickMotionExport } from "@/lib/editor-quick-gif";
import { requireActiveUser } from "@/server/auth/permissions";
import type { EditorQuickMotionConfig } from "@/types/homecheff-visual-editor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: { sessionId?: string; config?: Partial<EditorQuickMotionConfig> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.sessionId?.trim()) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const job = planQuickMotionExport(
    {
      sessionId: body.sessionId,
      name: "Quick motion",
      sourceKind: "upload",
      sourceAssetId: null,
      backgroundUrl: "",
      workflowStep: "visual_editor",
      objects: [],
      placements: [],
      status: "editing",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      quickMotionConfig: body.config as EditorQuickMotionConfig | undefined,
    },
    body.config
  );

  return NextResponse.json({ ok: true, job });
}
