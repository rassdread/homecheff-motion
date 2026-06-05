"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildCharacterBlockingForSceneDetail,
  buildCharacterBlockingPlan,
  isCharacterBlockingPlanReady,
} from "@/lib/studio-character-blocking-director";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  scene?: StudioSceneDetail;
  className?: string;
};

function blockingStatus(
  plan: ReturnType<typeof buildCharacterBlockingPlan>
): "ready" | "attention" | "incomplete" {
  if (!plan.enabled) {
    return "incomplete";
  }
  if (plan.blockingWarnings.some((w) => w.severity === "warning")) {
    return "attention";
  }
  return isCharacterBlockingPlanReady(plan) ? "ready" : "incomplete";
}

export function StudioCharacterBlockingPanel({ storyboard, scene, className = "" }: Props) {
  const t = useActiveTranslator();
  const plan = useMemo(() => buildCharacterBlockingPlan(storyboard), [storyboard]);
  const single = useMemo(
    () => (scene ? buildCharacterBlockingForSceneDetail(scene) : null),
    [scene]
  );

  const scenesToShow = single ? [single] : plan.sceneBlockings;
  const status = blockingStatus(plan);

  if (!plan.enabled && !single) {
    return null;
  }

  return (
    <section
      className={`rounded-2xl border border-amber-200 bg-white p-4 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {t("studio.blocking.panelTitle")}
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            status === "ready"
              ? "bg-emerald-50 text-emerald-800"
              : status === "attention"
                ? "bg-amber-50 text-amber-900"
                : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {t(`studio.blocking.status.${status}` as never)}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-600">{t("studio.blocking.panelHint")}</p>

      <div className="mt-4 space-y-3">
        {scenesToShow.map((blocking) => (
          <article
            key={blocking.sceneId}
            className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              {t("studio.blocking.sceneLabel", { order: String(blocking.order + 1) })}
            </p>
            {blocking.activeSpeakerName || blocking.isNarratorScene ?
              <p className="mt-1 text-xs text-slate-600">
                {blocking.isNarratorScene
                  ? t("studio.blocking.narratorSpeaking")
                  : t("studio.blocking.activeSpeaker", { name: blocking.activeSpeakerName ?? "" })}
              </p>
            : null}
            {blocking.blockingSummary && !blocking.blockingSummary.startsWith("studio.") ?
              <p className="mt-1 text-xs font-medium text-slate-800">{blocking.blockingSummary}</p>
            : null}

            {blocking.characterActions.length > 0 ?
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {blocking.characterActions.map((row) => {
                  const pose = blocking.characterPoses.find((p) => p.characterId === row.characterId);
                  const attention = blocking.attentionTargets.find(
                    (a) => a.characterId === row.characterId
                  );
                  return (
                    <li key={`${blocking.sceneId}-${row.characterId}`}>
                      <span className="font-medium">{row.characterName}</span>
                      {" — "}
                      {t(`studio.blocking.action.${row.action}` as never)}
                      {pose ?
                        <>
                          {" · "}
                          {t(`studio.blocking.pose.${pose.pose}` as never)}
                        </>
                      : null}
                      {attention ?
                        <>
                          {" · "}
                          {t(`studio.blocking.attention.${attention.target}` as never)}
                        </>
                      : null}
                    </li>
                  );
                })}
              </ul>
            : null}

            {blocking.interaction.interactionType !== "NONE" ?
              <p className="mt-2 text-[11px] text-slate-600">
                <span className="font-semibold">{t("studio.blocking.interactionLabel")}: </span>
                {t(blocking.interaction.descriptionKey as never)}
              </p>
            : null}

            {blocking.blockingWarnings.length > 0 ?
              <ul className="mt-2 space-y-1 text-[11px] text-amber-900">
                {blocking.blockingWarnings.map((w, i) => (
                  <li key={`${w.code}-${i}`}>
                    {t(w.messageKey as never, w.params as never)}
                  </li>
                ))}
              </ul>
            : null}
          </article>
        ))}
      </div>

      {!scene && plan.blockingWarnings.filter((w) => !w.sceneId).length > 0 ?
        <ul className="mt-4 space-y-1 text-xs text-amber-900">
          {plan.blockingWarnings
            .filter((w) => !w.sceneId)
            .map((w, i) => (
              <li key={`${w.code}-${i}`}>{t(w.messageKey as never, w.params as never)}</li>
            ))}
        </ul>
      : null}
    </section>
  );
}
