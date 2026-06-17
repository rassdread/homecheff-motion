import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { generateStoryboardTranscript } from "@/server/studio/generate-storyboard-transcript";
import { isStudioVoiceExecutionLanguage } from "@/types/studio-voice-execution";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;

  let language: string | undefined;
  let forceMock = false;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      language?: string;
      mock?: boolean;
    };
    const lang = body.language?.trim().toLowerCase().slice(0, 2);
    language = lang && isStudioVoiceExecutionLanguage(lang) ? lang : undefined;
    forceMock = body.mock === true || process.env.NODE_ENV === "test";
  } catch {
    /* empty body ok */
  }

  return runBilledProviderRoute({
    user,
    actionType: "subtitle_transcription",
    projectId: id,
    execute: () =>
      generateStoryboardTranscript({
        storyboardId: id,
        viewer: user,
        language,
        forceProvider: forceMock ? "mock" : undefined,
      }),
    isFailure: (result) => "error" in result,
    onSuccess: (result, estimatedCredits) => {
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error.message, code: result.error.code },
          { status: result.error.httpStatus }
        );
      }
      return NextResponse.json(withEstimatedCredits({ ok: true, ...result.data }, estimatedCredits));
    },
  });
}
