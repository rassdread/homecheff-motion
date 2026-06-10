import type { EditorSavePayload } from "@/lib/editor-canvas-export";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import { notifyStudioLibraryRefresh } from "@/lib/studio-library-refresh";

const LOCAL_SAVED_KEY = "hc-editor-library-saved-v1";

export type EditorSaveMode =
  | "official_reference"
  | "draft"
  | "new_asset"
  | "edited_copy"
  | "canonical_base"
  | "animation_ready"
  | "composition"
  | "cutout"
  | "gif_asset"
  | "print_export"
  | "motion_ready_export";

export type EditorLibraryPersistResult = {
  ok: boolean;
  mode: EditorSaveMode;
  persistedTo: "server" | "local_fallback";
  assetId: string | null;
  entityKind?: "character" | "prop" | "location" | "upload";
  libraryHref?: string;
  messageKey: string;
  savedAt: string;
};

type LocalSavedRecord = {
  sessionId: string;
  mode: EditorSaveMode;
  payload: EditorSavePayload;
  savedAt: string;
  sourceAssetId: string | null;
};

function readLocalSaved(): LocalSavedRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_SAVED_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as LocalSavedRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalSaved(records: LocalSavedRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify(records));
}

export function listLocalEditorSavedRecords(): LocalSavedRecord[] {
  return readLocalSaved();
}

export function persistEditorSaveLocalFallback(
  payload: EditorSavePayload,
  mode: EditorSaveMode
): EditorLibraryPersistResult {
  const savedAt = new Date().toISOString();
  const record: LocalSavedRecord = {
    sessionId: payload.sessionId,
    mode,
    payload,
    savedAt,
    sourceAssetId: payload.sourceAssetId,
  };
  const next = [record, ...readLocalSaved().filter((r) => r.sessionId !== payload.sessionId)].slice(0, 50);
  writeLocalSaved(next);
  return {
    ok: true,
    mode,
    persistedTo: "local_fallback",
    assetId: payload.sourceAssetId,
    messageKey: "editor.review.save.localFallback",
    savedAt,
  };
}

export async function persistEditorSave(
  document: EditorCanvasDocument,
  payload: EditorSavePayload,
  mode: EditorSaveMode
): Promise<EditorLibraryPersistResult> {
  try {
    const res = await fetch("/api/editor/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ mode, payload, sourceKind: document.sourceKind }),
    });
    if (res.ok) {
      const body = (await res.json()) as {
        assetId?: string;
        persistedTo?: string;
        entityKind?: EditorLibraryPersistResult["entityKind"];
        libraryHref?: string;
      };
      notifyStudioLibraryRefresh({ assetId: body.assetId, entityKind: body.entityKind });
      return {
        ok: true,
        mode,
        persistedTo: body.persistedTo === "server" ? "server" : "local_fallback",
        assetId: body.assetId ?? payload.sourceAssetId,
        entityKind: body.entityKind,
        libraryHref: body.libraryHref,
        messageKey: "editor.review.save.success",
        savedAt: new Date().toISOString(),
      };
    }
  } catch {
    /* fall through to local */
  }
  return persistEditorSaveLocalFallback(payload, mode);
}

export function resolveEditorSaveMode(
  document: EditorCanvasDocument,
  action: "official" | "draft" | "new" | "edited_copy" | "canonical" | "animation_ready"
): EditorSaveMode {
  if (action === "draft") {
    return "draft";
  }
  if (action === "new") {
    return "new_asset";
  }
  if (action === "edited_copy") {
    return "edited_copy";
  }
  if (action === "canonical") {
    return "canonical_base";
  }
  if (action === "animation_ready") {
    return "animation_ready";
  }
  return "official_reference";
}
