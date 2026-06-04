import type { TranslationKey } from "@/i18n";
import { getTranslator } from "@/i18n";

const PRESET_PREFIX = "studio.storyboards.preset.";

export function studioScenePresetLabel(
  t: ReturnType<typeof getTranslator>,
  group: "action" | "emotion" | "camera",
  value: string
): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "—";
  }
  const key = `${PRESET_PREFIX}${group}.${trimmed}` as TranslationKey;
  const translated = t(key);
  if (translated !== key) {
    return translated;
  }
  return trimmed;
}
