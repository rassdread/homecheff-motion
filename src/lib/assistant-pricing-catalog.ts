import type { StudioPricingCatalogPublicEntry } from "@/types/studio-pricing-catalog";

const PRICING_QUESTION_PATTERNS = [
  /\bwat kost\b/i,
  /\bhoeveel credits\b/i,
  /\bcredits?\s*(kost|nodig|heb ik)\b/i,
  /\bwhat does .* cost\b/i,
  /\bhow many credits\b/i,
  /\bhow much does\b/i,
  /\bpricing\b/i,
  /\bprijs\b/i,
];

const ACTION_KEYWORD_MAP: Array<{ pattern: RegExp; actionType: string }> = [
  { pattern: /(doelpunt|goal.?celebr|motion.?render|motion|video|clip|animatie)/i, actionType: "motion_render" },
  { pattern: /\b(mascotte|personage|character)\b/i, actionType: "character_generation" },
  { pattern: /\b(stem\s*klonen|voice\s*clone|stemklonen|voiceclone)\b/i, actionType: "voice_clone" },
  { pattern: /\b(stem|voice|voice-over)\b/i, actionType: "voice_generation" },
  { pattern: /\b(muziek|music)\b/i, actionType: "music_generation" },
  { pattern: /\b(geluid|sfx|sound effect)\b/i, actionType: "sfx_generation" },
  { pattern: /\b(ondertitel|subtitle|transcript)\b/i, actionType: "subtitle_transcription" },
  { pattern: /\b(vertaling|translation)\b/i, actionType: "translation_export" },
  { pattern: /\b(storyboard)\b/i, actionType: "storyboard_generation" },
  { pattern: /\b(scène|scene)\b/i, actionType: "scene_generation" },
  { pattern: /\b(editor|afbeelding|image|fusion)\b/i, actionType: "image_generation" },
  { pattern: /\b(publish|export|mp4|photo story)\b/i, actionType: "publish_mp4_export" },
];

export function isAssistantPricingQuestion(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) {
    return false;
  }
  return PRICING_QUESTION_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function resolvePricingQuestionActionType(message: string): string | null {
  for (const row of ACTION_KEYWORD_MAP) {
    if (row.pattern.test(message)) {
      return row.actionType;
    }
  }
  return null;
}

export function buildAssistantPricingCatalogReply(input: {
  message: string;
  catalog: StudioPricingCatalogPublicEntry[];
  locale?: string;
}): { replyNl: string; replyEn: string; actionType: string | null; creditCost: number | null } | null {
  if (!isAssistantPricingQuestion(input.message)) {
    return null;
  }

  const nl = !input.locale || input.locale.startsWith("nl");
  const actionType = resolvePricingQuestionActionType(input.message);
  const catalogRow =
    actionType ? input.catalog.find((row) => row.actionType === actionType) : null;

  const visibleMotion = input.catalog.find((row) => row.actionType === "motion_render");
  const fallbackRow = catalogRow ?? visibleMotion ?? input.catalog[0] ?? null;

  if (!fallbackRow) {
    return {
      actionType: null,
      creditCost: null,
      replyNl:
        "Ik kan nu geen actuele creditprijzen ophalen. Bekijk /pricing of je account voor het overzicht.",
      replyEn: "I can't fetch current credit prices right now. Check /pricing or your account for the overview.",
    };
  }

  const credits = fallbackRow.creditCost;
  const name = fallbackRow.displayName;

  const reuseTipNl =
    " Als je bestaande assets hergebruikt, voorkom je extra kosten voor personages of achtergronden.";
  const reuseTipEn =
    " Reusing existing assets helps you avoid extra costs for characters or backgrounds.";

  if (actionType === "motion_render" || /\b(doelpunt|goal|video|motion)\b/i.test(input.message)) {
    return {
      actionType: fallbackRow.actionType,
      creditCost: credits,
      replyNl: `Een Motion-render gebruikt ongeveer ${credits} credits.${reuseTipNl}`,
      replyEn: `A Motion render uses about ${credits} credits.${reuseTipEn}`,
    };
  }

  if (actionType === "character_generation" || /\b(mascotte|personage|character)\b/i.test(input.message)) {
    return {
      actionType: fallbackRow.actionType,
      creditCost: credits,
      replyNl: `Een personage genereren kost ongeveer ${credits} credits.${reuseTipNl}`,
      replyEn: `Generating a character costs about ${credits} credits.${reuseTipEn}`,
    };
  }

  return {
    actionType: fallbackRow.actionType,
    creditCost: credits,
    replyNl: `${name} kost ongeveer ${credits} credits.${reuseTipNl}`,
    replyEn: `${name} costs about ${credits} credits.${reuseTipEn}`,
  };
}
