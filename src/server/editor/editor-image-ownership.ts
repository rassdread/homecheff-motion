import { isUserGeneratedStorageKey } from "@/lib/studio-asset-registry-visibility";
import { isValidDataImageUrl, isValidHttpUrl } from "@/lib/is-valid-http-url";

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

export function validateEditorSegmentImageSource(input: {
  imageUrl?: string;
  imageBase64?: string;
  backgroundStorageKey?: string;
  userId: string;
}): { ok: true; source: "url" | "base64"; imageUrl?: string; imageBase64?: string } | { ok: false; error: string } {
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
