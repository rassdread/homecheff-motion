import { NextResponse } from "next/server";
import {
  hasAssistantInterpretationApiKey,
  isAssistantAiInterpretationEnabled,
} from "@/lib/assistant-interpretation-flag";
import { interpretAssistantRequest } from "@/lib/assistant-interpretation-engine";
import { resolveAssistantInterpretation } from "@/server/assistant/assistant-interpretation-llm";

export const runtime = "nodejs";

type InterpretBody = {
  message?: string;
  locale?: "nl" | "en";
};

export async function POST(request: Request) {
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

  const interpretation = await resolveAssistantInterpretation({
    message,
    locale,
    useLlm,
  });

  if (!interpretation) {
    return NextResponse.json({ interpretation: null, source: "none" });
  }

  return NextResponse.json({
    interpretation,
    source: interpretation.source,
    usedLlm: useLlm && interpretation.source === "llm",
    fallbackAvailable: Boolean(interpretAssistantRequest(message, { locale })),
  });
}
