import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { cloneCharacterVoice } from "@/server/studio/clone-character-voice";
import {
  resolveAudioRouteIdempotencyKey,
  runAudioGenerationJobRoute,
} from "@/server/studio-generation/run-audio-generation-job-route";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: characterId } = await context.params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data.", code: "INVALID_FORM" }, { status: 400 });
  }

  const sample = form.get("sample");
  if (!(sample instanceof File) || sample.size <= 0) {
    return NextResponse.json(
      { error: "Upload a voice sample file.", code: "SAMPLE_REQUIRED" },
      { status: 400 }
    );
  }

  const consentRaw = form.get("consentConfirmed");
  const consentConfirmed =
    consentRaw === "true" || consentRaw === "1" || consentRaw === "on";
  const voiceNameEntry = form.get("voiceName");
  const voiceName = typeof voiceNameEntry === "string" ? voiceNameEntry : "";
  const voiceLockRaw = form.get("voiceLock");
  const voiceLock = voiceLockRaw === "true" || voiceLockRaw === "1";
  const languageEntry = form.get("language");
  const language = typeof languageEntry === "string" ? languageEntry : undefined;
  const mutationEntry = form.get("clientMutationId");
  const clientMutationId =
    typeof mutationEntry === "string" && mutationEntry.trim() ? mutationEntry.trim() : null;
  const forceMock = process.env.NODE_ENV === "test" || form.get("mock") === "true";

  const buffer = Buffer.from(await sample.arrayBuffer());
  const idempotencyKey = resolveAudioRouteIdempotencyKey({
    request,
    clientMutationId,
    fallbackPrefix: `voice_clone:character:${characterId}`,
    operationFingerprint: `character:${characterId}:${sample.size}:${sample.name}:${voiceName}`,
  });

  return runAudioGenerationJobRoute({
    user,
    capability: "VOICE_CLONE",
    actionType: "voice_clone",
    idempotencyKey,
    relatedJobId: characterId,
    inputSnapshot: {
      action: "voice_clone",
      characterId,
      voiceName,
      language: language ?? null,
      sampleBytes: buffer.length,
      sampleName: sample.name.slice(0, 120),
    },
    execute: () =>
      cloneCharacterVoice({
        characterId,
        viewer: user,
        sampleBuffer: buffer,
        fileName: sample.name,
        mimeType: sample.type,
        voiceName,
        consentConfirmed,
        voiceLock: voiceLockRaw != null ? voiceLock : undefined,
        language: language ?? undefined,
        forceProvider: forceMock ? "mock" : undefined,
      }),
    isFailure: (result) => "error" in result,
    getOutputAssetId: (result) => {
      if ("error" in result) return null;
      return result.data.voiceProfileRef || result.data.characterId;
    },
    mapFailure: (result) => {
      if ("error" in result) {
        return {
          error: result.error.message,
          code: result.error.code,
          status: result.error.httpStatus,
        };
      }
      return { error: "Clone failed.", code: "CLONE_FAILED" };
    },
    mapSuccess: (result, estimatedCredits) => {
      if ("error" in result) {
        return { error: result.error.message };
      }
      return withEstimatedCredits({ ok: true, ...result.data }, estimatedCredits) as unknown as Record<
        string,
        unknown
      >;
    },
    mapReplay: async (job) => ({
      characterId,
      voiceProfileRef: job.outputAssetId,
    }),
  });
}
