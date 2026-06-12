export type PublishFontPreset = "modern" | "bold" | "cinematic" | "elegant" | "clean";
export type PublishSizePreset = "xs" | "s" | "m" | "l" | "xl";
export type PublishColorPreset = "white" | "black" | "hc_green" | "hc_blue" | "yellow" | "custom";
export type PublishOutlinePreset = "none" | "thin" | "medium" | "strong";
export type PublishShadowPreset = "none" | "light" | "medium" | "strong";
export type PublishBackgroundPreset = "none" | "glass" | "black_transparent" | "white_transparent" | "brand";
export type PublishAnimationPreset = "none" | "fade" | "slide_up" | "slide_left" | "pop" | "typewriter";
export type PublishTextTemplate = "social" | "commercial" | "story" | "quote" | "cta";

export type PublishTextStylePreset = {
  font: PublishFontPreset;
  size: PublishSizePreset;
  sizePx?: number;
  color: PublishColorPreset;
  customColor?: string;
  outline: PublishOutlinePreset;
  shadow: PublishShadowPreset;
  background: PublishBackgroundPreset;
  animation: PublishAnimationPreset;
  template?: PublishTextTemplate;
};

export const DEFAULT_PUBLISH_TEXT_STYLE: PublishTextStylePreset = {
  font: "modern",
  size: "m",
  color: "white",
  outline: "thin",
  shadow: "light",
  background: "glass",
  animation: "fade",
};

export const PUBLISH_TEXT_TEMPLATES: Record<PublishTextTemplate, Partial<PublishTextStylePreset>> = {
  social: { font: "bold", size: "l", color: "white", animation: "pop", template: "social" },
  commercial: { font: "cinematic", size: "xl", color: "hc_blue", outline: "medium", template: "commercial" },
  story: { font: "elegant", size: "m", color: "white", background: "black_transparent", template: "story" },
  quote: { font: "clean", size: "l", color: "white", animation: "fade", template: "quote" },
  cta: { font: "bold", size: "m", color: "hc_green", background: "brand", animation: "slide_up", template: "cta" },
};

export function resolvePublishFontSize(preset: PublishTextStylePreset): number {
  if (preset.sizePx) return preset.sizePx;
  const map: Record<PublishSizePreset, number> = { xs: 14, s: 18, m: 24, l: 32, xl: 42 };
  return map[preset.size];
}

export function resolvePublishColorHex(preset: PublishTextStylePreset): string {
  if (preset.color === "custom" && preset.customColor) return preset.customColor;
  const map: Record<Exclude<PublishColorPreset, "custom">, string> = {
    white: "#ffffff",
    black: "#111111",
    hc_green: "#006D52",
    hc_blue: "#0067B1",
    yellow: "#facc15",
  };
  return map[preset.color === "custom" ? "white" : preset.color];
}

export function applyTextTemplate(template: PublishTextTemplate): PublishTextStylePreset {
  return { ...DEFAULT_PUBLISH_TEXT_STYLE, ...PUBLISH_TEXT_TEMPLATES[template] };
}
