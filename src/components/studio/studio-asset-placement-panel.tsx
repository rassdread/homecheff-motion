"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildAssetPlacementForSceneDetail,
  buildAssetPlacementPlan,
  isAssetPlacementPlanReady,
} from "@/lib/studio-asset-placement-director";
import { buildSceneCompositionForScene } from "@/lib/studio-scene-composition-director";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  scene?: StudioSceneDetail;
  className?: string;
};

function compositionTypeKey(type: string): string {
  return `studio.composition.type.${type}`;
}

function placementStatus(plan: ReturnType<typeof buildAssetPlacementPlan>): "ready" | "attention" | "incomplete" {
  if (!plan.enabled) {
    return "incomplete";
  }
  if (plan.placementWarnings.some((w) => w.severity === "warning")) {
    return "attention";
  }
  return isAssetPlacementPlanReady(plan) ? "ready" : "incomplete";
}

export function StudioAssetPlacementPanel({ storyboard, scene, className = "" }: Props) {
  const t = useActiveTranslator();
  const plan = useMemo(() => buildAssetPlacementPlan(storyboard), [storyboard]);
  const single = useMemo(
    () => (scene ? buildAssetPlacementForSceneDetail(scene) : null),
    [scene]
  );

  const scenesToShow = single ? [single] : plan.scenePlacements;
  const status = placementStatus(plan);

  if (!plan.enabled && !single) {
    return null;
  }

  const composition = scene ? buildSceneCompositionForScene(scene) : null;

  return (
    <section
      className={`rounded-2xl border border-teal-200 bg-white p-4 shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {t("studio.placement.panelTitle")}
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
          {t(`studio.placement.status.${status}` as never)}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-600">{t("studio.placement.panelHint")}</p>

      {!scene && plan.visualHierarchySummary.primarySubject ?
        <p className="mt-3 text-xs text-teal-900">
          <span className="font-semibold">{t("studio.placement.primarySubject")}: </span>
          {plan.visualHierarchySummary.primarySubject}
          {plan.visualHierarchySummary.secondarySubject ?
            <>
              {" · "}
              <span className="font-semibold">{t("studio.placement.secondarySubject")}: </span>
              {plan.visualHierarchySummary.secondarySubject}
            </>
          : null}
        </p>
      : null}

      <div className="mt-4 space-y-3">
        {scenesToShow.map((placement) => {
          const compType =
            placement.compositionType ||
            composition?.compositionType ||
            "medium_shot";
          const focus =
            placement.primarySubject ??
            composition?.visualFocus.entityName ??
            t("studio.composition.focus.none");
          return (
            <article
              key={placement.sceneId}
              className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                {t("studio.placement.sceneLabel", { order: String(placement.order + 1) })}
              </p>
              <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">{t("studio.placement.compositionType")}</dt>
                  <dd className="font-semibold text-slate-900">
                    {t(compositionTypeKey(compType) as never)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("studio.placement.visualFocus")}</dt>
                  <dd className="font-semibold text-slate-900">{focus}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">{t("studio.placement.placementPlan")}</dt>
                  <dd className="font-medium text-slate-800">
                    {placement.placementSummary.startsWith("studio.")
                      ? t(placement.placementSummary as never)
                      : placement.placementSummary}
                  </dd>
                </div>
              </dl>

              {placement.characterPlacements.length > 0 ?
                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-slate-700">
                    {t("studio.placement.characters")}
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-slate-700">
                    {placement.characterPlacements.map((row) => (
                      <li key={`${placement.sceneId}-${row.characterId}`}>
                        <span className="font-medium">{row.characterName}</span>
                        {" — "}
                        {t(`studio.placement.zone.${row.zone}` as never)}
                        {" · "}
                        {t(`studio.placement.depth.${row.depth}` as never)}
                        {" · "}
                        {t(`studio.placement.scale.${row.scale}` as never)}
                        {" · "}
                        {t(`studio.placement.orientation.${row.orientation}` as never)}
                      </li>
                    ))}
                  </ul>
                </div>
              : null}

              {placement.propPlacements.length > 0 ?
                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-slate-700">
                    {t("studio.placement.props")}
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-slate-700">
                    {placement.propPlacements.map((row) => (
                      <li key={`${placement.sceneId}-${row.propId}`}>
                        {row.propName}: {t(`studio.placement.zone.${row.zone}` as never)}{" "}
                        {t(`studio.placement.depth.${row.depth}` as never)}
                      </li>
                    ))}
                  </ul>
                </div>
              : null}

              {placement.brandPlacements.length > 0 ?
                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-slate-700">
                    {t("studio.placement.brands")}
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-slate-700">
                    {placement.brandPlacements.map((row) => (
                      <li key={`${placement.sceneId}-${row.brandId}`}>
                        {row.brandName}: {t(`studio.placement.zone.${row.zone}` as never)}
                      </li>
                    ))}
                  </ul>
                </div>
              : null}

              {placement.placementWarnings.length > 0 ?
                <ul className="mt-2 space-y-1 text-[11px] text-amber-900">
                  {placement.placementWarnings.map((w, i) => (
                    <li key={`${w.code}-${i}`}>
                      {t(w.messageKey as never, w.params as never)}
                    </li>
                  ))}
                </ul>
              : null}
            </article>
          );
        })}
      </div>

      {!scene && plan.placementWarnings.filter((w) => !w.sceneId).length > 0 ?
        <ul className="mt-4 space-y-1 text-xs text-amber-900">
          {plan.placementWarnings
            .filter((w) => !w.sceneId)
            .map((w, i) => (
              <li key={`${w.code}-${i}`}>{t(w.messageKey as never, w.params as never)}</li>
            ))}
        </ul>
      : null}
    </section>
  );
}
