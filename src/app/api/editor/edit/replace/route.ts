import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { executeEditorMaskedReplace } from "@/server/editor/editor-masked-openai-edit";
import type { EditorMaskEditJob } from "@/types/homecheff-visual-editor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    sessionId?: string;
    layerId?: string;
    imageUrl?: string;
    maskUrl?: string;
    objectLabel?: string;
    prompt?: string;
    backgroundStorageKey?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  const layerId = body.layerId?.trim();
  const imageUrl = body.imageUrl?.trim();
  const maskUrl = body.maskUrl?.trim();
  const objectLabel = body.objectLabel?.trim() || "object";
  const prompt = body.prompt?.trim();

  if (!sessionId || !layerId || !imageUrl || !maskUrl || !prompt) {
    return NextResponse.json(
      { error: "sessionId, layerId, imageUrl, maskUrl, and prompt are required." },
      { status: 400 }
    );
  }

  const jobId = `edit_replace_${layerId}_${Date.now()}`;
  const now = new Date().toISOString();
  const runningJob: EditorMaskEditJob = {
    id: jobId,
    layerId,
    operation: "replace",
    status: "running",
    progress: 0.1,
    message: "Generating replacement…",
    createdAt: now,
    updatedAt: now,
  };

  return runBilledProviderRoute({
    user,
    actionType: "image_edit",
    relatedJobId: sessionId,
    execute: () =>
      executeEditorMaskedReplace({
        userId: user.id,
        sessionId,
        layerId,
        imageUrl,
        maskUrl,
        objectLabel,
        prompt,
        backgroundStorageKey: body.backgroundStorageKey,
        jobId,
      }),
    isFailure: (result) => !result.ok,
    onSuccess: (result, estimatedCredits) => {
      const completedAt = new Date().toISOString();
      if (!result.ok) {
        const failedJob: EditorMaskEditJob = {
          ...runningJob,
          status: "failed",
          progress: 1,
          message: result.message,
          updatedAt: completedAt,
        };
        return NextResponse.json(
          { ok: false, job: failedJob, error: result.message },
          { status: result.code === "VALIDATION" ? 400 : 502 }
        );
      }

      const completedJob: EditorMaskEditJob = {
        ...runningJob,
        status: "completed",
        progress: 1,
        message: "Object replaced.",
        resultUrl: result.resultUrl,
        updatedAt: completedAt,
      };

      return NextResponse.json(
        withEstimatedCredits(
          {
            ok: true,
            job: completedJob,
            resultUrl: result.resultUrl,
            storageKey: result.storageKey,
          },
          estimatedCredits
        )
      );
    },
  });
}
