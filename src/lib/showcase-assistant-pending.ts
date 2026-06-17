const SHOWCASE_ASSISTANT_PENDING_KEY = "hc-showcase-assistant-pending";

export function storeShowcaseAssistantPending(prompt: string): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(SHOWCASE_ASSISTANT_PENDING_KEY, prompt.trim());
}

export function consumeShowcaseAssistantPending(): string | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  const value = sessionStorage.getItem(SHOWCASE_ASSISTANT_PENDING_KEY);
  if (value) {
    sessionStorage.removeItem(SHOWCASE_ASSISTANT_PENDING_KEY);
    return value;
  }
  return null;
}
