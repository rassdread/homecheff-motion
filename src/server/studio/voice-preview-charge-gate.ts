import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  decideVoicePreviewCharge,
  VOICE_PREVIEW_CONFIRMATION_CODE,
} from "@/lib/studio-voice-preview-charge";
import { getActionCost } from "@/server/studio-account/studio-action-cost-registry";

export async function voicePreviewChargeResponse(input: {
  userId: string;
  confirmCharge: boolean;
  cacheHit: boolean;
}): Promise<NextResponse | null> {
  const credits = getActionCost("voice_generation")?.defaultCreditCost ?? 15;
  const wallet = await prisma.studioWallet.findUnique({
    where: { userId: input.userId },
    select: { balance: true, reservedBalance: true },
  });
  const studioHcAvailable = wallet ? wallet.balance - wallet.reservedBalance : null;
  const decision = decideVoicePreviewCharge({
    cacheHit: input.cacheHit,
    confirmCharge: input.confirmCharge,
    credits,
    studioHcAvailable,
  });
  if (decision.action === "play_free" || decision.action === "charge") {
    return null;
  }
  const insufficient = decision.action === "insufficient";
  return NextResponse.json(
    {
      error: insufficient
        ? "Er is niet genoeg Studio HC voor dit voorbeeld."
        : "Bevestig de Studio HC-kosten voordat het voorbeeld wordt gemaakt.",
      code: insufficient ? "INSUFFICIENT_CREDITS" : VOICE_PREVIEW_CONFIRMATION_CODE,
      cached: false,
      free: false,
      credits,
      studioHcAvailable,
    },
    { status: 402 }
  );
}
