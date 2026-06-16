import type { TranslationKey, TranslationParams } from "@/i18n";
import type { AssistantRecommendation } from "@/types/assistant-recommendation";

type Translator = (key: TranslationKey, params?: TranslationParams) => string;

export function formatAssistantRecommendationCardCopy(
  t: Translator,
  item: AssistantRecommendation
): { title: string; description: string; statusNote?: string } {
  return {
    title: t(item.titleKey as TranslationKey, {
      defaultValue: item.promptMessage,
      name: item.characterName ?? "",
    }),
    description: t(item.descriptionKey as TranslationKey, {
      defaultValue: item.promptMessage,
    }),
    statusNote: item.statusNoteKey
      ? t(item.statusNoteKey as TranslationKey, { name: item.characterName ?? "" })
      : undefined,
  };
}
