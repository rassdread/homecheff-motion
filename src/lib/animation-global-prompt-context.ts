/** Stored on new projects; older rows may be null — use `resolveGlobalPromptContext`. */
export const DEFAULT_GLOBAL_ANIMATION_CONTEXT = `
This animation is ONE continuous video sequence.
Each transformation must feel like a continuation of the previous one.
The subject, style, lighting, and motion must remain consistent across all steps.
No resets, no cuts, no scene breaks.
All images are part of the same evolving world.
`.trim();

export function resolveGlobalPromptContext(
  stored: string | null | undefined
): string {
  const trimmed = stored?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : DEFAULT_GLOBAL_ANIMATION_CONTEXT;
}
