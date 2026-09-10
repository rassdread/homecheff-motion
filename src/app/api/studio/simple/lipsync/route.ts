import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { withStudioCreditGate } from "@/server/studio-account/with-studio-credit-gate";
import { usdToCredits } from "@/lib/studio-credit-constants";
import {
  estimateLipsyncReservedUsd,
  getLipsyncProviderId,
  isTrueLipsyncConfigured,
} from "@/lib/lipsync/config";
import { executeLipSync } from "@/server/lipsync/execute-lipsync";

/**
 * Execute true lip-sync for Simple Studio talking-photo flows.
 * Body: { imageUrl, audioUrl, projectId, durationSeconds?, aspectRatio?, behaviorPrompt? }
 */
export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;

  if (!isTrueLipsyncConfigured()) {
    return NextResponse.json(
      {
        error: "True lip-sync is not configured on this environment.",
        code: "LIPSYNC_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  let body: {
    imageUrl?: string;
    audioUrl?: string;
    projectId?: string;
    durationSeconds?: number;
    aspectRatio?: "9:16" | "1:1" | "16:9";
    behaviorPrompt?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_BODY" }, { status: 400 });
  }

  const imageUrl = body.imageUrl?.trim() ?? "";
  const audioUrl = body.audioUrl?.trim() ?? "";
  const projectId = body.projectId?.trim() || `simple-${user.id.slice(0, 8)}`;
  if (!imageUrl || !audioUrl) {
    return NextResponse.json(
      { error: "imageUrl and audioUrl are required.", code: "MEDIA_REQUIRED" },
      { status: 400 },
    );
  }

  const provider = getLipsyncProviderId();
  const durationSeconds = Math.min(35, Math.max(3, Number(body.durationSeconds) || 15));
  const reservedUsd = estimateLipsyncReservedUsd({ provider, durationSeconds });
  const overrideCredits = usdToCredits(reservedUsd, 50);

  const gated = await withStudioCreditGate({
    user,
    actionType: "lipsync_talking_avatar",
    projectId,
    confirmed: true,
    overrideCredits,
    execute: async () =>
      executeLipSync({
        ownerId: user.id,
        projectId,
        imageUrl,
        audioUrl,
        durationSeconds,
        aspectRatio: body.aspectRatio ?? "9:16",
        behaviorPrompt: body.behaviorPrompt,
      }),
    isFailure: (result) => !result.ok,
  });

  if ("blocked" in gated) return gated.blocked;

  if (!gated.result.ok) {
    return NextResponse.json(
      {
        error: gated.result.message,
        code: gated.result.code,
        provider: gated.result.provider,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    provider: gated.result.provider,
    providerJobId: gated.result.providerJobId,
    videoUrl: gated.result.videoUrl,
    durationSeconds: gated.result.durationSeconds,
    estimatedCredits: gated.estimatedCredits ?? overrideCredits,
    lipsyncExecuted: true,
  });
}
