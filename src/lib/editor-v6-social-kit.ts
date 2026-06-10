import type { EditorCanvasDocument, EditorSocialPreset } from "@/types/homecheff-visual-editor";

export type SocialPresetSpec = {
  id: EditorSocialPreset;
  labelKey: string;
  width: number;
  height: number;
  formats: Array<"png" | "jpg" | "webp">;
};

export const SOCIAL_PRESET_SPECS: Record<EditorSocialPreset, SocialPresetSpec> = {
  instagram_post: { id: "instagram_post", labelKey: "editor.v6.social.instagramPost", width: 1080, height: 1080, formats: ["png", "jpg"] },
  instagram_story: { id: "instagram_story", labelKey: "editor.v6.social.instagramStory", width: 1080, height: 1920, formats: ["png", "jpg"] },
  tiktok_cover: { id: "tiktok_cover", labelKey: "editor.v6.social.tiktokCover", width: 1080, height: 1920, formats: ["png", "jpg"] },
  youtube_thumbnail: { id: "youtube_thumbnail", labelKey: "editor.v6.social.youtubeThumbnail", width: 1280, height: 720, formats: ["png", "jpg"] },
  facebook_post: { id: "facebook_post", labelKey: "editor.v6.social.facebookPost", width: 1200, height: 630, formats: ["png", "jpg"] },
  linkedin_post: { id: "linkedin_post", labelKey: "editor.v6.social.linkedinPost", width: 1200, height: 627, formats: ["png", "jpg"] },
  x_post: { id: "x_post", labelKey: "editor.v6.social.xPost", width: 1600, height: 900, formats: ["png", "jpg"] },
  pinterest: { id: "pinterest", labelKey: "editor.v6.social.pinterest", width: 1000, height: 1500, formats: ["png", "jpg"] },
};

export function applySocialPreset(
  document: EditorCanvasDocument,
  preset: EditorSocialPreset
): EditorCanvasDocument {
  const spec = SOCIAL_PRESET_SPECS[preset];
  return {
    ...document,
    workspaceMode: "export",
    productivityState: {
      ...document.productivityState,
      socialPreset: preset,
    },
    exportSettings: {
      ...document.exportSettings,
      profile: "production_ready",
      production: {
        formats: [...spec.formats, "webp"],
        transparentBackground: false,
        retinaScale: 2,
        quality: 0.9,
        width: spec.width,
        height: spec.height,
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function socialExportDimensions(preset: EditorSocialPreset): { width: number; height: number } {
  const spec = SOCIAL_PRESET_SPECS[preset];
  return { width: spec.width, height: spec.height };
}
