import { parseEditorCanvasProjectPayload } from "@/lib/editor-project-payload";
import { isUserGeneratedStorageKey } from "@/lib/studio-asset-registry-visibility";
import { isValidDataImageUrl, isValidHttpUrl } from "@/lib/is-valid-http-url";
import { getEditorCanvasProject } from "@/server/editor/editor-canvas-project-service";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorSegmentImageSource =
  | { ok: true; source: "url" | "base64"; imageUrl?: string; imageBase64?: string }
  | { ok: false; error: string };

export function isEditorImageUrlOwnedByUser(imageUrl: string, userId: string): boolean {
  if (!isValidHttpUrl(imageUrl)) {
    return false;
  }
  try {
    const parsed = new URL(imageUrl.trim());
    const path = decodeURIComponent(parsed.pathname);
    if (path.includes(`/studio/${userId}/`)) {
      return true;
    }
    if (path.includes("/generated/animations/") && path.includes(userId)) {
      return true;
    }
    if (
      parsed.hostname.endsWith(".public.blob.vercel-storage.com") ||
      parsed.hostname.endsWith(".blob.vercel-storage.com")
    ) {
      const segment = path.split("/studio/")[1]?.split("/")[0];
      return segment === userId;
    }
    return path.includes(`/${userId}/`) || path.includes(`users/${userId}/`);
  } catch {
    return false;
  }
}

export function isEditorSessionScopedVariantImageUrl(imageUrl: string, sessionId: string): boolean {
  if (!isValidHttpUrl(imageUrl) || !sessionId.trim()) {
    return false;
  }
  try {
    const path = decodeURIComponent(new URL(imageUrl.trim()).pathname);
    return path.includes(`/editor/instruction-variants/${sessionId.trim()}/`);
  } catch {
    return false;
  }
}

export function isEditorDocumentImageUrl(document: EditorCanvasDocument, imageUrl: string): boolean {
  const normalized = imageUrl.trim();
  if (!normalized) {
    return false;
  }
  if (document.backgroundUrl?.trim() === normalized) {
    return true;
  }
  return (document.instructionVariants ?? []).some(
    (variant) =>
      variant.resultUrl?.trim() === normalized || variant.sourceImageUrl?.trim() === normalized
  );
}

export function validateEditorSegmentImageSource(input: {
  imageUrl?: string;
  imageBase64?: string;
  backgroundStorageKey?: string;
  userId: string;
}): EditorSegmentImageSource {
  if (input.imageBase64?.trim()) {
    const data = input.imageBase64.trim();
    if (!isValidDataImageUrl(data) && !/^data:image\/[a-z+]+;base64,/i.test(data)) {
      return { ok: false, error: "Invalid imageBase64." };
    }
    return { ok: true, source: "base64", imageBase64: data };
  }

  const imageUrl = input.imageUrl?.trim();
  if (!imageUrl || !isValidHttpUrl(imageUrl)) {
    return { ok: false, error: "imageUrl or imageBase64 is required." };
  }

  const ownedByKey = input.backgroundStorageKey
    ? isUserGeneratedStorageKey(input.backgroundStorageKey, input.userId)
    : false;
  const ownedByUrl = isEditorImageUrlOwnedByUser(imageUrl, input.userId);

  if (!ownedByKey && !ownedByUrl) {
    return { ok: false, error: "Image source is not owned by the current user." };
  }

  return { ok: true, source: "url", imageUrl };
}

/** Accept project-scoped editor images (motion uploads, prior variants) when URL matches owned session. */
export async function validateEditorInstructionVariantImageSource(input: {
  userId: string;
  sessionId: string;
  imageUrl?: string;
  imageBase64?: string;
  backgroundStorageKey?: string;
}): Promise<EditorSegmentImageSource> {
  const base = validateEditorSegmentImageSource(input);
  if (base.ok) {
    return base;
  }

  const sessionId = input.sessionId.trim();
  const imageUrl = input.imageUrl?.trim();
  if (!sessionId || !imageUrl) {
    return base;
  }

  const row = await getEditorCanvasProject(input.userId, sessionId);
  if (!row) {
    return base;
  }

  const document = parseEditorCanvasProjectPayload(row.payload);
  if (!document) {
    return base;
  }

  if (isEditorDocumentImageUrl(document, imageUrl)) {
    return { ok: true, source: "url", imageUrl };
  }

  if (isEditorSessionScopedVariantImageUrl(imageUrl, sessionId)) {
    return { ok: true, source: "url", imageUrl };
  }

  return base;
}
