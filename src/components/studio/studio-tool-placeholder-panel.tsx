"use client";

import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { StudioToolId } from "@/lib/studio-tool-id";

const TITLE_KEYS: Record<StudioToolId, TranslationKey> = {
  production: "studio.tools.production",
  creationAssistant: "studio.tools.creationAssistant",
  creativeReview: "studio.tools.creativeReview",
  story: "studio.tools.story",
  characters: "studio.tools.characters",
  locations: "studio.tools.locations",
  props: "studio.tools.props",
  world: "studio.tools.world",
  visual: "studio.tools.visual",
  consistency: "studio.tools.consistency",
  continuity: "studio.tools.continuity",
  voice: "studio.tools.voice",
  music: "studio.tools.music",
  sound: "studio.tools.sound",
  text: "studio.tools.text",
  subtitles: "studio.tools.subtitles",
  render: "studio.tools.render",
  versions: "studio.tools.versions",
  translate: "studio.tools.translate",
  export: "studio.tools.export",
};

const BODY_KEYS: Partial<Record<StudioToolId, TranslationKey>> = {
  voice: "studio.tools.placeholder.voice",
  music: "studio.tools.placeholder.music",
  sound: "studio.tools.placeholder.sound",
  text: "studio.tools.placeholder.text",
  subtitles: "studio.tools.placeholder.subtitles",
  translate: "studio.tools.placeholder.translate",
  export: "studio.tools.placeholder.export",
};

type Props = {
  tool: StudioToolId;
};

export function StudioToolPlaceholderPanel({ tool }: Props) {
  const t = useActiveTranslator();
  const bodyKey = BODY_KEYS[tool] ?? "studio.tools.placeholder.generic";

  return (
    <AppCard className="border-dashed border-zinc-200 bg-zinc-50/80 p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
        {t("studio.tools.comingInEditor")}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-zinc-900">{t(TITLE_KEYS[tool])}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-600">{t(bodyKey)}</p>
    </AppCard>
  );
}
