import { resolveEditorStudioEntry } from "@/lib/editor-studio-entry";

export type EditorMotionBootstrap = {
  imageUrl: string;
  label: string;
  sessionId: string;
  assetId?: string;
  source: "editor_session" | "editor_asset";
};

export function resolveEditorMotionBootstrap(params: {
  editorSession?: string | null;
  editorAsset?: string | null;
  assetImageUrl?: string | null;
}): EditorMotionBootstrap | null {
  const sessionEntry = resolveEditorStudioEntry(params.editorSession);
  if (sessionEntry) {
    const imageUrl = sessionEntry.cutoutUrls[0] ?? sessionEntry.primaryImageUrl;
    if (!imageUrl) {
      return null;
    }
    return {
      imageUrl,
      label: sessionEntry.document.name,
      sessionId: sessionEntry.sessionId,
      assetId: params.editorAsset?.trim() || sessionEntry.document.sourceAssetId || undefined,
      source: "editor_session",
    };
  }

  const assetId = params.editorAsset?.trim();
  const imageUrl = params.assetImageUrl?.trim();
  if (assetId && imageUrl) {
    return {
      imageUrl,
      label: "Editor asset",
      sessionId: params.editorSession?.trim() ?? "",
      assetId,
      source: "editor_asset",
    };
  }

  return null;
}
