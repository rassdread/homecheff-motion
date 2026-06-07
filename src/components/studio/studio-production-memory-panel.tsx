"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildProductionMemoryProfile } from "@/lib/studio-production-memory-profile";
import type {
  StudioCharacterListItem,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type { ProductionMemoryCreationGuidance } from "@/types/studio-production-memory";

type Props = {
  memory: StudioProjectMemorySnapshot;
  currentIdea?: string;
  characters?: StudioCharacterListItem[];
  worlds?: StudioWorldProfileListItem[];
  guidance?: ProductionMemoryCreationGuidance | null;
  compact?: boolean;
  timelineGuidanceKeys?: string[];
};

function MemoryChip({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700">
      {label}
    </span>
  );
}

export function StudioProductionMemoryPanel({
  memory,
  currentIdea,
  characters,
  worlds,
  guidance,
  compact = false,
  timelineGuidanceKeys = [],
}: Props) {
  const t = useActiveTranslator();

  const profile = useMemo(
    () =>
      buildProductionMemoryProfile({
        memory,
        currentIdea,
        libraries: { characters, worlds },
      }),
    [memory, currentIdea, characters, worlds]
  );

  const activeGuidance = guidance ?? profile.creationGuidance;
  const hasContent =
    profile.totalProductions >= 2 ||
    profile.topCharacters.length > 0 ||
    profile.recurringWorlds.length > 0 ||
    profile.recurringStyles.length > 0 ||
    profile.recurringRenderStrategies.length > 0;

  if (!hasContent) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.productionMemory.title")}
        </h3>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.productionMemory.empty")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        {t("studio.productionMemory.title")}
      </h3>
      <p className="mt-1 text-sm text-zinc-600">{t("studio.productionMemory.subtitle")}</p>

      {activeGuidance ?
        <div className="mt-3 rounded-xl border border-violet-200 bg-white/80 p-3">
          <p className="text-sm font-medium text-zinc-900">
            {t("studio.productionMemory.guidance.title")}
          </p>
          <p className="mt-1 text-sm text-zinc-700">
            {t(activeGuidance.messageKey as TranslationKey, activeGuidance.messageParams)}
          </p>
          {activeGuidance.startWithSuggestionKey ?
            <p className="mt-2 text-sm text-violet-900">
              {t(
                activeGuidance.startWithSuggestionKey as TranslationKey,
                activeGuidance.startWithParams
              )}
            </p>
          : null}
        </div>
      : null}

      {timelineGuidanceKeys.length > 0 ?
        <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
          <p className="text-sm font-medium text-zinc-900">
            {t("studio.productionMemory.timelineGuidance.title")}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {timelineGuidanceKeys.slice(0, 3).map((key) => (
              <li key={key}>→ {t(key as TranslationKey)}</li>
            ))}
          </ul>
        </div>
      : null}

      {!compact ?
        <div className="mt-4 space-y-3">
          {profile.productionPatterns.length > 0 ?
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t("studio.productionMemory.section.patterns")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.productionPatterns.slice(0, 4).map((pattern) => (
                  <MemoryChip
                    key={pattern.id}
                    label={t(pattern.labelKey as TranslationKey, {
                      count: String(pattern.matchCount),
                    })}
                  />
                ))}
              </div>
            </div>
          : null}

          {profile.recurringWorlds.length > 0 ?
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t("studio.productionMemory.section.worlds")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.recurringWorlds.slice(0, 4).map((world) => (
                  <MemoryChip
                    key={world.id}
                    label={t(world.labelKey as TranslationKey, world.params)}
                  />
                ))}
              </div>
            </div>
          : null}

          {profile.topCharacters.length > 0 ?
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t("studio.productionMemory.section.characters")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.topCharacters.slice(0, 4).map((character) => (
                  <MemoryChip
                    key={character.id}
                    label={t(character.labelKey as TranslationKey, character.params)}
                  />
                ))}
              </div>
            </div>
          : null}

          {profile.recurringStyles.length > 0 ?
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t("studio.productionMemory.section.styles")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.recurringStyles.slice(0, 3).map((style) => (
                  <MemoryChip
                    key={style.id}
                    label={t(style.labelKey as TranslationKey, style.params)}
                  />
                ))}
              </div>
            </div>
          : null}

          {profile.recurringRenderStrategies.length > 0 ?
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t("studio.productionMemory.section.renderApproaches")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.recurringRenderStrategies.slice(0, 3).map((render) => (
                  <MemoryChip
                    key={render.id}
                    label={t(render.labelKey as TranslationKey, {
                      count: String(render.storyboardCount),
                    })}
                  />
                ))}
              </div>
            </div>
          : null}

          {profile.recurringVoiceTypes.length > 0 ?
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t("studio.productionMemory.section.voices")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.recurringVoiceTypes.slice(0, 3).map((voice) => (
                  <MemoryChip
                    key={voice.profileId}
                    label={t(voice.labelKey as TranslationKey, {
                      count: String(voice.storyboardCount),
                    })}
                  />
                ))}
              </div>
            </div>
          : null}
        </div>
      : null}
    </section>
  );
}
