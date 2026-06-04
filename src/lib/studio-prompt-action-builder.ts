const ACTION_PHRASES: Record<string, string> = {
  cooking: "Preparing food carefully with natural kitchen movement.",
  talking: "Speaking naturally with engaged conversational gestures.",
  walking: "Walking naturally through the environment.",
  working: "Working with focused, purposeful movement.",
  shopping: "Browsing and interacting with products in a lively setting.",
  presenting: "Showing and explaining a product with clear demonstration.",
  celebrating: "Celebrating with upbeat movement and positive energy.",
  typing: "Typing and interacting with a screen or device.",
};

export function buildActionPrompt(action: string): string {
  const trimmed = action.trim();
  if (!trimmed) {
    return "";
  }
  const key = trimmed.toLowerCase().replace(/\s+/g, "_");
  return ACTION_PHRASES[key] ?? trimmed;
}
