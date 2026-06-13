import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { withStudioCreditGate } from "@/server/studio-account/with-studio-credit-gate";
import { parseSubtitleEntriesJson } from "@/lib/studio-subtitle-track";
import { generateStoryboardVoice } from "@/server/studio/generate-storyboard-voice";
import { getStudioStoryboardById } from "@/server/studio/studio-storyboard-service";
import { prisma } from "@/lib/prisma";
import { isStudioVoiceExecutionLanguage } from "@/types/studio-voice-execution";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  const { id } = await context.params;
  const storyboard = await getStudioStoryboardById(id, user);
  if (!storyboard) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const lang = (storyboard.voiceLanguage ?? "en").trim().toLowerCase().slice(0, 2);
  const [voice, subtitle, allVoices] = await Promise.all([
    prisma.studioStoryboardVoice.findUnique({
      where: { storyboardId_language: { storyboardId: id, language: lang } },
    }),
    prisma.studioStoryboardSubtitleTrack.findUnique({
      where: { storyboardId_language: { storyboardId: id, language: lang } },
    }),
    prisma.studioStoryboardVoice.findMany({
      where: { storyboardId: id },
      orderBy: { language: "asc" },
    }),
  ]);
  return NextResponse.json({
    voice,
    subtitle: subtitle
      ? {
          ...subtitle,
          entries: parseSubtitleEntriesJson(subtitle.entriesJson),
        }
      : null,
    voices: allVoices,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  const { id } = await context.params;
  const storyboard = await getStudioStoryboardById(id, user);
  if (!storyboard) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (storyboard.ownerId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let language: string | undefined;
  let forceMock = false;
  let confirmed = false;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      language?: string;
      mock?: boolean;
      confirmed?: boolean;
    };
    language = body.language?.trim().toLowerCase().slice(0, 2);
    forceMock = body.mock === true || process.env.NODE_ENV === "test";
    confirmed = body.confirmed === true;
  } catch {
    /* empty body ok */
  }

  const gated = await withStudioCreditGate({
    user,
    actionType: "voice_generation",
    projectId: id,
    confirmed,
    execute: () =>
      generateStoryboardVoice({
    storyboard,
    ownerId: storyboard.ownerId,
    language:
      language && isStudioVoiceExecutionLanguage(language) ? language : undefined,
        forceProvider: forceMock ? "mock" : undefined,
      }),
    isFailure: (result) => "error" in result,
  });

  if ("blocked" in gated) {
    return gated.blocked;
  }

  const result = gated.result;
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  return NextResponse.json({ ok: true, ...result.data });
}
