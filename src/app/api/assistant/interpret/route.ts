import { NextResponse } from "next/server";
import {
  hasAssistantInterpretationApiKey,
  isAssistantAiInterpretationEnabled,
} from "@/lib/assistant-interpretation-flag";
import { interpretAssistantRequest } from "@/lib/assistant-interpretation-engine";
import { requireActiveUser } from "@/server/auth/permissions";
import { resolveAssistantInterpretation } from "@/server/assistant/assistant-interpretation-llm";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";

export const runtime = "nodejs";

type InterpretBody = {
  message?: string;
  locale?: "nl" | "en";
};

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: InterpretBody;
  try {
    body = (await request.json()) as InterpretBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = body.message?.trim() ?? "";
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const locale = body.locale === "nl" ? "nl" : "en";
  const useLlm = isAssistantAiInterpretationEnabled() && hasAssistantInterpretationApiKey();

  return runBilledProviderRoute({
    user,
    actionType: "assistant_interpret",
    execute: async () => {
      const interpretation = await resolveAssistantInterpretation({
        message,
        locale,
        useLlm,
      });

      if (!interpretation) {
        return { ok: true as const, interpretation: null, source: "none" as const, usedLlm: false, fallbackAvailable: Boolean(interpretAssistantRequest(message, { locale })) };
      }

      return {
        ok: true as const,
        interpretation,
        source: interpretation.source,
        usedLlm: useLlm && interpretation.source === "llm",
        fallbackAvailable: Boolean(interpretAssistantRequest(message, { locale })),
      };
    },
    onSuccess: (result, estimatedCredits) =>
      NextResponse.json(
        withEstimatedCredits(
          {
            interpretation: result.interpretation,
            source: result.source,
            usedLlm: result.usedLlm,
            fallbackAvailable: result.fallbackAvailable,
          },
          estimatedCredits
        )
      ),
  });
}
