export type PublishWizardTypingDiagnostics = {
  typingStarted: number;
  autosaveTriggered: number;
  rerenderCount: number;
  remountCount: number;
  scrollDelta: number;
};

const INITIAL: PublishWizardTypingDiagnostics = {
  typingStarted: 0,
  autosaveTriggered: 0,
  rerenderCount: 0,
  remountCount: 0,
  scrollDelta: 0,
};

let store: PublishWizardTypingDiagnostics = { ...INITIAL };

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function getPublishWizardTypingDiagnostics(): PublishWizardTypingDiagnostics {
  return { ...store };
}

export function resetPublishWizardTypingDiagnostics(): void {
  store = { ...INITIAL };
  emit();
}

export function subscribePublishWizardTypingDiagnostics(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function recordPublishWizardTypingStarted(): void {
  store = { ...store, typingStarted: store.typingStarted + 1 };
  emit();
}

export function recordPublishWizardAutosaveTriggered(): void {
  store = { ...store, autosaveTriggered: store.autosaveTriggered + 1 };
  emit();
}

export function recordPublishWizardRerender(): void {
  store = { ...store, rerenderCount: store.rerenderCount + 1 };
  emit();
}

export function recordPublishWizardRemount(): void {
  store = { ...store, remountCount: store.remountCount + 1 };
  emit();
}

export function recordPublishWizardScrollDelta(delta: number): void {
  if (delta === 0) return;
  store = { ...store, scrollDelta: store.scrollDelta + Math.abs(delta) };
  emit();
}
