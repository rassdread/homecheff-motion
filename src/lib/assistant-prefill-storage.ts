import type { AssistantPrefillPackage } from "@/types/assistant-prefill";

export const ASSISTANT_PREFILL_STORAGE_KEY = "hc-assistant-prefill-v1";
export const ASSISTANT_EDITOR_FUSION_BOOTSTRAP_KEY = "hc-assistant-editor-fusion-bootstrap-v1";

type PrefillStore = Record<string, AssistantPrefillPackage>;

function readStore(): PrefillStore {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.sessionStorage.getItem(ASSISTANT_PREFILL_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as PrefillStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: PrefillStore): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(ASSISTANT_PREFILL_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function createAssistantPrefillId(): string {
  return `asst-prefill-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function storeAssistantPrefillPackage(pkg: AssistantPrefillPackage): AssistantPrefillPackage {
  const store = readStore();
  store[pkg.id] = pkg;
  writeStore(store);
  return pkg;
}

export function loadAssistantPrefillPackage(id: string | null | undefined): AssistantPrefillPackage | null {
  if (!id?.trim()) {
    return null;
  }
  const pkg = readStore()[id.trim()];
  if (!pkg || pkg.version !== 1) {
    return null;
  }
  return pkg;
}

export function updateAssistantPrefillPackage(
  id: string,
  patch: Partial<AssistantPrefillPackage>
): AssistantPrefillPackage | null {
  const existing = loadAssistantPrefillPackage(id);
  if (!existing) {
    return null;
  }
  const next = { ...existing, ...patch, id: existing.id, version: 1 as const };
  return storeAssistantPrefillPackage(next);
}

export function clearAssistantPrefillPackage(id: string | null | undefined): void {
  if (!id?.trim() || typeof window === "undefined") {
    return;
  }
  const store = readStore();
  delete store[id.trim()];
  writeStore(store);
}

export function buildAssistantPrefillRoute(route: string, prefillId: string): string {
  const url = new URL(route, "http://local");
  url.searchParams.set("prefillId", prefillId);
  return `${url.pathname}${url.search}`;
}

export function readAssistantPrefillIdFromSearch(
  params: URLSearchParams | { get: (key: string) => string | null }
): string | null {
  return params.get("prefillId")?.trim() || null;
}

export function storeAssistantEditorFusionBootstrap(pkg: AssistantPrefillPackage): void {
  if (typeof window === "undefined" || !pkg.fusion) {
    return;
  }
  try {
    window.sessionStorage.setItem(
      ASSISTANT_EDITOR_FUSION_BOOTSTRAP_KEY,
      JSON.stringify({
        prefillId: pkg.id,
        fusionIntent: pkg.fusion.fusionIntent,
        fusionArchetype: pkg.fusion.fusionArchetype,
        outputSettings: pkg.outputSettings,
        protectionSettings: pkg.protectionSettings,
        questionAnswers: pkg.questionAnswers,
        requiredInputRoles: pkg.fusion.requiredInputRoles,
      })
    );
  } catch {
    /* ignore */
  }
}

export function loadAssistantEditorFusionBootstrap(): {
  prefillId: string;
  fusionIntent?: string;
  fusionArchetype?: string;
  outputSettings?: Record<string, string | boolean | string[]>;
  protectionSettings?: Record<string, boolean>;
  questionAnswers?: Record<string, string>;
  requiredInputRoles?: string[];
} | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(ASSISTANT_EDITOR_FUSION_BOOTSTRAP_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ReturnType<typeof loadAssistantEditorFusionBootstrap> extends infer T ? T : never;
  } catch {
    return null;
  }
}

export function clearAssistantEditorFusionBootstrap(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(ASSISTANT_EDITOR_FUSION_BOOTSTRAP_KEY);
  } catch {
    /* ignore */
  }
}
