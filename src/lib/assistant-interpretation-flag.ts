/**
 * AI interpretation for HomeCheff Assistant V2.
 * Set NEXT_PUBLIC_HOMECHEFF_ASSISTANT_AI_INTERPRETATION=false to use rules only.
 */
export function isAssistantAiInterpretationEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_HOMECHEFF_ASSISTANT_AI_INTERPRETATION?.trim().toLowerCase();
  if (raw === "false" || raw === "0") {
    return false;
  }
  return true;
}

export function hasAssistantInterpretationApiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
