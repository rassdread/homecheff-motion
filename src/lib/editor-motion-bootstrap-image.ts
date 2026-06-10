import { INSTANT_WIZARD_DEFAULT_BAKED_TEXT } from "@/lib/reset-instant-premium-wizard";
import type { EditorMotionBootstrapPayload } from "@/hooks/use-editor-motion-bootstrap";
import { EMPTY_WIZARD_IMAGE_BLOB, type InstantWizardLocalImage } from "@/lib/instant-wizard-image-model";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";

export function mapEditorMotionBootstrapToWizardImage(
  bootstrap: EditorMotionBootstrapPayload
): InstantWizardLocalImage | null {
  const url = bootstrap.imageUrl?.trim();
  if (!url || !isValidHttpUrl(url)) {
    return null;
  }
  return {
    id: `editor-${bootstrap.sessionId || "asset"}-${bootstrap.assetId ?? "main"}-${url.slice(-12)}`,
    originalFileName: `${bootstrap.label || "Editor"}.png`,
    mimeType: "image/png",
    sizeBytes: 1,
    optimizedBlob: EMPTY_WIZARD_IMAGE_BLOB,
    thumbnailBlob: EMPTY_WIZARD_IMAGE_BLOB,
    remoteWorkingUrl: url,
    remoteThumbnailUrl: url,
    bakedText: { ...INSTANT_WIZARD_DEFAULT_BAKED_TEXT, enabled: false },
    previewUnavailable: false,
    imageSource: "manual",
  };
}
