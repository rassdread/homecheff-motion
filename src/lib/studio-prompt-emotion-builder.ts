const EMOTION_PHRASES: Record<string, string> = {
  happy: "Warm, happy expressions with relaxed open posture.",
  excited: "Energetic expressions, open posture, and visible enthusiasm.",
  proud: "Confident expressions and positive, proud body language.",
  focused: "Concentrated attention and deliberate, controlled movement.",
  curious: "Curious expressions with attentive, inquisitive body language.",
  serious: "Serious, composed expressions with grounded posture.",
  celebrating: "Joyful celebrating energy with expressive movement.",
};

export function buildEmotionPrompt(emotion: string): string {
  const trimmed = emotion.trim();
  if (!trimmed) {
    return "";
  }
  const key = trimmed.toLowerCase().replace(/\s+/g, "_");
  return EMOTION_PHRASES[key] ?? trimmed;
}
