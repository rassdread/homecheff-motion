"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  buildSceneActionShotDistribution,
  buildStoryboardActionShotDistribution,
} from "@/lib/studio-action-shot-distribution";
import { buildCharacterCapabilities } from "@/lib/studio-character-capabilities";
import type { SceneActionShotDistribution } from "@/types/studio-action-shot-distribution";
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
  distribution?: SceneActionShotDistribution | null;
  variant?: "full" | "compact";
  showApplyHint?: boolean;
  onUseSuggestion?: () => void;
  onKeepAsIs?: () => void;
};

const BEAT_ROLE_KEYS: Record<string, TranslationKey> = {
  opening: "studio.actionSequence.beatRole.opening",
  setup: "studio.actionSequence.beatRole.setup",
  action: "studio.actionSequence.beatRole.action",
  payoff: "studio.actionSequence.beatRole.payoff",
  closing: "studio.actionSequence.beatRole.closing",
};

const IMAGE_ROLE_KEYS: Record<string, TranslationKey> = {
  start_pose: "studio.actionSequence.image.startPose",
  action_pose: "studio.actionSequence.image.actionPose",
  payoff_pose: "studio.actionSequence.image.payoffPose",
  end_pose: "studio.actionSequence.image.endPose",
  scene_still: "studio.actionSequence.image.sceneStill",
};

function durationClass(level: string): string {
  if (level === "good") return "text-[#006D52]";
  if (level === "too_short") return "text-amber-800";
  return "text-orange-800";
}

export function StudioActionSequenceSummary({
  storyboard,
  scene,
  characters = [],
  props = [],
  worlds = [],
  distribution: distributionProp,
  variant = "full",
  showApplyHint = false,
  onUseSuggestion,
  onKeepAsIs,
}: Props) {
  const t = useActiveTranslator();

  const distribution = useMemo(() => {
    if (distributionProp) {
      return distributionProp;
    }
    if (scene) {
      const primaryChar = scene.characters[0];
      const characterPlan =
        primaryChar ?
          buildCharacterCapabilities({
            character: characters.find((c) => c.id === primaryChar.id) ?? primaryChar,
            worlds,
            props,
          })
        : null;
      return buildSceneActionShotDistribution({ scene, characterPlan });
    }
    const board = buildStoryboardActionShotDistribution({
      storyboard,
      characters,
      props,
      worlds,
    });
    return board.scenes.find((d) => d.suggestsMultipleShots) ?? board.scenes[0] ?? null;
  }, [distributionProp, scene, storyboard, characters, props, worlds]);

  if (!distribution || !distribution.suggestsMultipleShots) {
    return null;
  }

  const { actionChain, beats, durationAdvice, recommendedShotCount } = distribution;

  return (
    <section className="rounded-2xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        {t("studio.actionSequence.title")}
      </h3>
      <p className="mt-1 text-xs text-zinc-600">{t("studio.actionSequence.subtitle")}</p>

      {distribution.distributionReasonKey ?
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t(distribution.distributionReasonKey as TranslationKey)}
        </p>
      : null}

      <div className="mt-3 rounded-xl bg-white/90 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          {t("studio.actionSequence.actionSteps")}
        </p>
        <ol className="mt-1.5 space-y-1 text-xs text-zinc-800">
          {actionChain.steps.slice(0, variant === "compact" ? 4 : 8).map((step, i) => (
            <li key={`${step.id}-${i}`}>
              {i + 1}. {t(step.labelKey as TranslationKey)}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[10px] text-zinc-500">
          {t("studio.actionSequence.recommendedShots", {
            count: String(recommendedShotCount),
          })}
        </p>
      </div>

      {beats.length > 0 ?
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.actionSequence.shotBeats")}
          </p>
          <ol className="mt-1.5 space-y-2">
            {beats.slice(0, variant === "compact" ? 4 : 8).map((beat) => (
              <li
                key={beat.order}
                className="rounded-lg border border-zinc-100 bg-white/90 px-3 py-2 text-xs text-zinc-700"
              >
                <span className="font-semibold text-[#0067B1]">
                  {t("studio.renderStrategy.shotSplit.shotLabel", {
                    number: String(beat.order),
                  })}
                  {": "}
                </span>
                {t(beat.labelKey as TranslationKey)}
                {variant === "full" && BEAT_ROLE_KEYS[beat.role] ?
                  <span className="ml-1 text-[10px] text-zinc-500">
                    ({t(BEAT_ROLE_KEYS[beat.role]!)})
                  </span>
                : null}
                {beat.actionHint && beat.actionHint !== beat.labelKey ?
                  <p className="mt-0.5 text-[10px] text-zinc-500">{beat.actionHint}</p>
                : null}
              </li>
            ))}
          </ol>
        </div>
      : null}

      {variant === "full" && beats.some((b) => b.imageStatus !== "present") ?
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.actionSequence.requiredImages")}
          </p>
          <ul className="mt-1.5 space-y-1 text-xs">
            {beats
              .filter((b) => b.imageStatus !== "present")
              .slice(0, 6)
              .map((beat) => (
                <li
                  key={`img-${beat.order}`}
                  className={`rounded-lg px-3 py-2 ${
                    beat.imageStatus === "missing"
                      ? "bg-red-50 text-red-900"
                      : "bg-amber-50 text-amber-900"
                  }`}
                >
                  {IMAGE_ROLE_KEYS[beat.imageRole]
                    ? t(IMAGE_ROLE_KEYS[beat.imageRole]!)
                    : beat.imageRole}
                  {" — "}
                  {t(beat.labelKey as TranslationKey)}
                </li>
              ))}
          </ul>
        </div>
      : null}

      <div className={`mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs ${durationClass(durationAdvice.level)}`}>
        <span className="font-medium">
          {t("studio.actionSequence.duration.title")}
        </span>
        {" — "}
        {t(durationAdvice.adviceKey as TranslationKey, durationAdvice.adviceParams)}
      </div>

      {actionChain.missingSupportingAssets.length > 0 && variant === "full" ?
        <ul className="mt-2 space-y-1 text-[10px] text-amber-800">
          {actionChain.missingSupportingAssets.map((asset) => (
            <li key={asset.reasonKey}>
              {t(asset.reasonKey as TranslationKey, asset.reasonParams)}
            </li>
          ))}
        </ul>
      : null}

      {showApplyHint ?
        <div className="mt-3 flex flex-wrap gap-2">
          {onUseSuggestion ?
            <button
              type="button"
              onClick={onUseSuggestion}
              className="rounded-full bg-[#0067B1] px-3 py-1.5 text-xs font-semibold text-white"
            >
              {t("studio.actionSequence.useSuggestion")}
            </button>
          : null}
          {onKeepAsIs ?
            <button
              type="button"
              onClick={onKeepAsIs}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
            >
              {t("studio.actionSequence.keepAsIs")}
            </button>
          : null}
          <p className="w-full text-[10px] text-zinc-500">
            {t("studio.actionSequence.previewOnly")}
          </p>
        </div>
      : null}
    </section>
  );
}
