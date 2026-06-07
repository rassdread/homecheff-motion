"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  buildCharacterCapabilities,
  buildProjectActionMemoryTrends,
  buildStoryboardActionIntelligence,
  capabilityLabelKey,
} from "@/lib/studio-character-capabilities";
import type {
  CharacterCapabilityId,
  StoryboardActionIntelligence,
} from "@/types/studio-character-capabilities";
import type {
  StudioCharacterListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  scene?: StudioSceneDetail | null;
  characters?: StudioCharacterListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
  intelligence?: StoryboardActionIntelligence;
  variant?: "full" | "compact";
  showMemoryTrends?: boolean;
};

const CLASSIFICATION_LABEL_KEYS: Record<string, TranslationKey> = {
  supported: "studio.characterCapabilities.classification.supported",
  possible: "studio.characterCapabilities.classification.possible",
  unusual: "studio.characterCapabilities.classification.unusual",
  unsupported: "studio.characterCapabilities.classification.unsupported",
};

function classificationClass(level: string): string {
  if (level === "supported") return "text-[#006D52]";
  if (level === "possible") return "text-amber-800";
  if (level === "unusual") return "text-orange-800";
  return "text-zinc-500";
}

export function StudioCharacterCapabilitiesSummary({
  storyboard,
  scene,
  characters = [],
  props = [],
  worlds = [],
  intelligence: intelligenceProp,
  variant = "full",
  showMemoryTrends = true,
}: Props) {
  const t = useActiveTranslator();

  const intelligence = useMemo(
    () =>
      intelligenceProp ??
      buildStoryboardActionIntelligence({
        storyboard,
        characters,
        props,
        worlds,
      }),
    [intelligenceProp, storyboard, characters, props, worlds]
  );

  const sceneClassification = useMemo(() => {
    if (!scene) return null;
    return intelligence.sceneClassifications.find((c) => c.sceneId === scene.id) ?? null;
  }, [intelligence, scene]);

  const actionTrends = useMemo(
    () => (showMemoryTrends ? buildProjectActionMemoryTrends([storyboard]) : []),
    [storyboard, showMemoryTrends]
  );

  if (intelligence.characterPlans.length === 0 && storyboard.scenes.length === 0) {
    return null;
  }

  const primaryPlan = intelligence.characterPlans[0];

  return (
    <section className="rounded-2xl border border-[#006D52]/20 bg-[#006D52]/5 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        {t("studio.characterCapabilities.title")}
      </h3>
      <p className="mt-1 text-xs text-zinc-600">
        {t("studio.characterCapabilities.subtitle")}
      </p>

      {primaryPlan ?
        <div className="mt-3 space-y-3">
          <div className="rounded-xl bg-white/90 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.characterCapabilities.expectedActions")}
            </p>
            <p className="mt-1 text-xs text-zinc-800">
              {primaryPlan.expected.length > 0 ?
                primaryPlan.expected
                  .slice(0, variant === "compact" ? 4 : 8)
                  .map((id) => t(capabilityLabelKey(id as CharacterCapabilityId) as TranslationKey))
                  .join(" · ")
              : t("studio.characterCapabilities.noneExpected")}
            </p>
            {variant === "full" && primaryPlan.supported.length > primaryPlan.expected.length ?
              <>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {t("studio.characterCapabilities.supportedActions")}
                </p>
                <p className="mt-1 text-xs text-zinc-700">
                  {primaryPlan.supported
                    .filter((id) => !primaryPlan.expected.includes(id))
                    .slice(0, 6)
                    .map((id) => t(capabilityLabelKey(id as CharacterCapabilityId) as TranslationKey))
                    .join(" · ")}
                </p>
              </>
            : null}
            {variant === "full" && primaryPlan.possible.length > primaryPlan.supported.length ?
              <>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  {t("studio.characterCapabilities.possibleActions")}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  {primaryPlan.possible
                    .filter((id) => !primaryPlan.supported.includes(id))
                    .slice(0, 4)
                    .map((id) => t(capabilityLabelKey(id as CharacterCapabilityId) as TranslationKey))
                    .join(" · ")}
                </p>
              </>
            : null}
          </div>

          {intelligence.characterPlans.length > 1 && variant === "full" ?
            <ul className="space-y-2">
              {intelligence.characterPlans.slice(1, 3).map((plan) => (
                <li key={plan.characterId} className="rounded-lg bg-white/80 px-3 py-2 text-xs text-zinc-700">
                  <span className="font-medium text-zinc-900">{plan.characterName}</span>
                  {" — "}
                  {plan.expected
                    .slice(0, 4)
                    .map((id) => t(capabilityLabelKey(id as CharacterCapabilityId) as TranslationKey))
                    .join(" · ") || t("studio.characterCapabilities.noneExpected")}
                </li>
              ))}
            </ul>
          : null}
        </div>
      : null}

      {sceneClassification && sceneClassification.actions.length > 0 ?
        <div className="mt-3 rounded-xl border border-zinc-200 bg-white/90 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.characterCapabilities.sceneActions")}
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {sceneClassification.actions.slice(0, variant === "compact" ? 3 : 6).map((action, i) => (
              <li key={`${action.fragment}-${i}`} className="text-xs text-zinc-700">
                <span className={`font-medium ${classificationClass(action.classification)}`}>
                  {t(CLASSIFICATION_LABEL_KEYS[action.classification]!)}
                </span>
                {action.capabilityId ?
                  <>
                    {" — "}
                    {t(capabilityLabelKey(action.capabilityId) as TranslationKey)}
                  </>
                : null}
                {action.suggestionKey ?
                  <p className="mt-0.5 text-[10px] text-amber-800">
                    {t(action.suggestionKey as TranslationKey, action.suggestionParams)}
                  </p>
                : null}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {variant === "full" && intelligence.visualProductionHints.length > 0 ?
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.characterCapabilities.visualHints")}
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-zinc-700">
            {intelligence.visualProductionHints.map((hint) => (
              <li key={hint.messageKey} className="rounded-lg bg-white/80 px-3 py-2">
                {t(hint.messageKey as TranslationKey, hint.messageParams)}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {showMemoryTrends && actionTrends.length > 0 && variant === "full" ?
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.characterCapabilities.memoryTrends")}
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {actionTrends.map((trend) => (
              <li
                key={trend.capabilityId}
                className="rounded-full bg-white/90 px-3 py-1 text-[11px] text-zinc-700"
              >
                {t(trend.labelKey as TranslationKey)}
                {" ("}
                {trend.sceneCount}
                {")"}
              </li>
            ))}
          </ul>
        </div>
      : null}
    </section>
  );
}

/** Per-character capabilities for character tool panel. */
export function StudioSingleCharacterCapabilitiesSummary({
  character,
  props = [],
  worlds = [],
}: {
  character: StudioCharacterListItem;
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
}) {
  const t = useActiveTranslator();
  const plan = useMemo(
    () => buildCharacterCapabilities({ character, props, worlds }),
    [character, props, worlds]
  );

  return (
    <section className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
      <h4 className="text-xs font-semibold text-zinc-900">
        {t("studio.characterCapabilities.title")}
      </h4>
      <p className="mt-1 text-[11px] text-zinc-600">
        {plan.expected
          .slice(0, 6)
          .map((id) => t(capabilityLabelKey(id as CharacterCapabilityId) as TranslationKey))
          .join(" · ") || t("studio.characterCapabilities.noneExpected")}
      </p>
    </section>
  );
}
