"use client";

import { useMemo, type ReactNode } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildProductionMemoryProfile } from "@/lib/studio-production-memory-profile";
import { buildProductionPatternProfile } from "@/lib/studio-production-pattern-profile";
import type {
  StudioCharacterListItem,
  StudioPropListItem,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type { ProductionMemoryCreationGuidance } from "@/types/studio-production-memory";

type Props = {
  memory: StudioProjectMemorySnapshot;
  currentIdea?: string;
  characters?: StudioCharacterListItem[];
  worlds?: StudioWorldProfileListItem[];
  props?: StudioPropListItem[];
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

function PatternSubsection({
  titleKey,
  children,
}: {
  titleKey: TranslationKey;
  children: ReactNode;
}) {
  const t = useActiveTranslator();
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t(titleKey)}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function StudioProductionMemoryPanel({
  memory,
  currentIdea,
  characters,
  worlds,
  props,
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

  const patternProfile = useMemo(
    () =>
      buildProductionPatternProfile({
        projectMemory: memory,
        currentIdea,
        characters,
        worlds,
        props,
      }),
    [memory, currentIdea, characters, worlds, props]
  );

  const activeGuidance = guidance ?? profile.creationGuidance;
  const hasPatternContent =
    patternProfile.recurringProductionTypes.length > 0 ||
    patternProfile.structureSummary !== null ||
    patternProfile.recurringRenderStrategies.length > 0 ||
    patternProfile.recurringAssetCombinations.length > 0 ||
    patternProfile.recurringCharacters.length > 0 ||
    patternProfile.recurringWorlds.length > 0 ||
    patternProfile.recurringProps.length > 0 ||
    patternProfile.currentProductionType !== null;

  const hasContent =
    profile.totalProductions >= 2 ||
    profile.topCharacters.length > 0 ||
    profile.recurringWorlds.length > 0 ||
    profile.recurringStyles.length > 0 ||
    profile.recurringRenderStrategies.length > 0 ||
    hasPatternContent;

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

      {hasPatternContent ?
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
          <h4 className="text-sm font-semibold text-zinc-900">
            {t("studio.productionPattern.title")}
          </h4>
          <p className="mt-0.5 text-xs text-zinc-600">{t("studio.productionPattern.subtitle")}</p>

          <div className={`mt-3 space-y-3 ${compact ? "space-y-2" : ""}`}>
            {patternProfile.currentProductionTypeLabelKey ?
              <PatternSubsection titleKey="studio.productionPattern.section.currentType">
                <MemoryChip
                  label={t(
                    patternProfile.currentProductionTypeLabelKey as TranslationKey,
                    { count: "1" }
                  )}
                />
              </PatternSubsection>
            : null}

            {patternProfile.recurringProductionTypes.length > 0 ?
              <PatternSubsection titleKey="studio.productionPattern.section.productionTypes">
                {patternProfile.recurringProductionTypes.slice(0, compact ? 2 : 4).map((pattern) => (
                  <MemoryChip
                    key={pattern.id}
                    label={t(pattern.labelKey as TranslationKey, {
                      count: String(pattern.matchCount),
                    })}
                  />
                ))}
              </PatternSubsection>
            : null}

            {patternProfile.structureSummary ?
              <PatternSubsection titleKey="studio.productionPattern.section.structures">
                <MemoryChip
                  label={t(
                    patternProfile.structureSummary.labelKey as TranslationKey,
                    patternProfile.structureSummary.params
                  )}
                />
                {patternProfile.recurringStructures.slice(0, 2).map((structure) => (
                  <MemoryChip
                    key={structure.id}
                    label={t(structure.labelKey as TranslationKey, structure.params)}
                  />
                ))}
              </PatternSubsection>
            : null}

            {(patternProfile.recurringDurations.length > 0 ||
              patternProfile.recurringShotCounts.length > 0) ?
              <PatternSubsection titleKey="studio.productionPattern.section.timing">
                {patternProfile.recurringDurations.slice(0, 2).map((duration) => (
                  <MemoryChip
                    key={duration.id}
                    label={t(duration.labelKey as TranslationKey, {
                      count: String(duration.storyboardCount),
                    })}
                  />
                ))}
                {patternProfile.recurringShotCounts.slice(0, 2).map((shots) => (
                  <MemoryChip
                    key={shots.id}
                    label={t(shots.labelKey as TranslationKey, {
                      count: String(shots.storyboardCount),
                    })}
                  />
                ))}
              </PatternSubsection>
            : null}

            {patternProfile.recurringRenderStrategies.length > 0 ?
              <PatternSubsection titleKey="studio.productionPattern.section.render">
                {patternProfile.recurringRenderStrategies.slice(0, compact ? 2 : 3).map((render) => (
                  <MemoryChip
                    key={render.id}
                    label={t(render.labelKey as TranslationKey, {
                      count: String(render.storyboardCount),
                    })}
                  />
                ))}
              </PatternSubsection>
            : null}

            {!compact ?
              <>
                {patternProfile.recurringAssetCombinations.length > 0 ?
                  <PatternSubsection titleKey="studio.productionPattern.section.assets">
                    {patternProfile.recurringAssetCombinations.map((combo) => (
                      <MemoryChip
                        key={combo.id}
                        label={t(combo.labelKey as TranslationKey, combo.params)}
                      />
                    ))}
                  </PatternSubsection>
                : null}

                {patternProfile.recurringCharacters.length > 0 ?
                  <PatternSubsection titleKey="studio.productionPattern.section.characters">
                    {patternProfile.recurringCharacters.slice(0, 4).map((character) => (
                      <MemoryChip
                        key={character.id}
                        label={t(character.labelKey as TranslationKey, character.params)}
                      />
                    ))}
                  </PatternSubsection>
                : null}

                {patternProfile.recurringWorlds.length > 0 ?
                  <PatternSubsection titleKey="studio.productionPattern.section.worlds">
                    {patternProfile.recurringWorlds.slice(0, 4).map((world) => (
                      <MemoryChip
                        key={world.id}
                        label={t(world.labelKey as TranslationKey, world.params)}
                      />
                    ))}
                  </PatternSubsection>
                : null}

                {patternProfile.recurringProps.length > 0 ?
                  <PatternSubsection titleKey="studio.productionPattern.section.props">
                    {patternProfile.recurringProps.map((prop) => (
                      <MemoryChip
                        key={prop.id}
                        label={t(prop.labelKey as TranslationKey, prop.params)}
                      />
                    ))}
                  </PatternSubsection>
                : null}
              </>
            : null}
          </div>
        </div>
      : null}

      {!compact ?
        <div className="mt-4 space-y-3">
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
