/**
 * AI Production Assistant — advisory panels in workspace and project detail.
 * Set NEXT_PUBLIC_STUDIO_AI_ASSISTANT=false to hide without removing code paths.
 */
export function isStudioAiAssistantEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_STUDIO_AI_ASSISTANT?.trim().toLowerCase();
  if (raw === "false" || raw === "0") {
    return false;
  }
  return true;
}
