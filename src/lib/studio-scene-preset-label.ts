import type { TranslationKey } from "@/i18n";
import { getTranslator } from "@/i18n";

const PRESET_PREFIX = "studio.storyboards.preset.";

export function studioScenePresetLabel(
  t: ReturnType<typeof getTranslator>,
  group: "action" | "emotion" | "camera" | "shot" | "movement" | "energy" | "director",
  value: string
): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "—";
  }
  const prefix = group === "shot" || group === "movement" || group === "energy" || group === "director"
    ? "studio.director."
    : PRESET_PREFIX;
  const key = `${prefix}${group}.${trimmed}` as TranslationKey;
  const translated = t(key);
  if (translated !== key) {
    return translated;
  }
  return trimmed;
}
