"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildSceneCompositionDirector,
  buildSceneCompositionForScene,
} from "@/lib/studio-scene-composition-director";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  /** When set, show a single scene only (embedded in scene composer). */
  scene?: StudioSceneDetail;
  className?: string;
};

function compositionTypeKey(type: string): string {
  return `studio.composition.type.${type}`;
}

function roleKey(role: string): string {
  return `studio.composition.role.${role}`;
}

export function StudioSceneCompositionPanel({ storyboard, scene, className = "" }: Props) {
  const t = useActiveTranslator();
  const plan = useMemo(() => buildSceneCompositionDirector(storyboard), [storyboard]);
  const single = useMemo(
    () => (scene ? buildSceneCompositionForScene(scene) : null),
    [scene]
  );

  const scenesToShow =
    single ?
      [single]
    : plan.sceneCompositions;

  if (!plan.enabled && !single) {
    return null;
  }

  const characterPlans = scene ?
    plan.characterPlacementPlans.filter((p) => p.sceneId === scene.id)
  : plan.characterPlacementPlans;
  const propPlans = scene ?
    plan.propPlacementPlans.filter((p) => p.sceneId === scene.id)
  : plan.propPlacementPlans;
  const brandPlans = scene ?
    plan.brandPlacementPlans.filter((p) => p.sceneId === scene.id)
  : plan.brandPlacementPlans;
  const locationPlans = scene ?
    plan.locationCompositionPlans.filter((p) => p.sceneId === scene.id)
  : plan.locationCompositionPlans;

  return (
    <section
      className={`rounded-2xl border border-violet-200 bg-white p-4 shadow-sm ${className}`}
    >
      <h3 className="text-sm font-semibold text-slate-900">
        {t("studio.composition.panelTitle")}
      </h3>
      <p className="mt-1 text-xs text-slate-600">{t("studio.composition.panelHint")}</p>

      {!scene && plan.visualFocusSummary ?
        <p className="mt-3 text-xs text-violet-900">
          <span className="font-semibold">{t("studio.composition.visualFocusSummary")}: </span>
          {plan.visualFocusSummary.startsWith("studio.") ?
            t(plan.visualFocusSummary as never)
          : plan.visualFocusSummary}
        </p>
      : null}

      <div className="mt-4 space-y-3">
        {scenesToShow.map((composition) => (
          <article
            key={composition.sceneId}
            className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
              {t("studio.composition.sceneLabel", { order: String(composition.order + 1) })}
            </p>
            <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">{t("studio.composition.compositionType")}</dt>
                <dd className="font-semibold text-slate-900">
                  {t(compositionTypeKey(composition.compositionType) as never)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t("studio.composition.visualFocus")}</dt>
                <dd className="font-semibold text-slate-900">
                  {composition.visualFocus.entityName ??
                    t(composition.visualFocus.labelKey as never)}
                </dd>
              </div>
              {composition.secondaryVisualFocus ?
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">{t("studio.composition.secondaryFocus")}</dt>
                  <dd className="font-medium text-slate-800">
                    {composition.secondaryVisualFocus.entityName ??
                      t(composition.secondaryVisualFocus.labelKey as never)}
                  </dd>
                </div>
              : null}
            </dl>
            {composition.compositionWarnings.length > 0 ?
              <ul className="mt-2 space-y-1 text-[11px] text-amber-900">
                {composition.compositionWarnings.map((w, i) => (
                  <li key={`${w.code}-${i}`}>
                    {t(w.messageKey as never, w.params as never)}
                  </li>
                ))}
              </ul>
            : null}
          </article>
        ))}
      </div>

      {characterPlans.length > 0 ?
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-700">
            {t("studio.composition.characterRoles")}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {characterPlans.map((p) => (
              <li key={`${p.sceneId}-${p.characterId}`}>
                <span className="font-medium">{p.characterName}</span>
                {" — "}
                {t(roleKey(p.visualRole) as never)}
                {" · "}
                {t(`studio.composition.position.${p.screenPosition}` as never)}
                {" · "}
                {t(`studio.composition.depth.${p.depth}` as never)}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {propPlans.length > 0 ?
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-700">{t("studio.composition.propRoles")}</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {propPlans.map((p) => (
              <li key={`${p.sceneId}-${p.propId}`}>
                {p.propName}
                {p.linkedCharacterName ? ` → ${p.linkedCharacterName}` : ""}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {locationPlans.length > 0 ?
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-700">
            {t("studio.composition.locationRole")}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {locationPlans.map((p) => (
              <li key={p.sceneId}>
                {p.locationName ?? t("studio.composition.location.none")}
                {" — "}
                {t(`studio.composition.crowding.${p.crowdingLevel}` as never)}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {brandPlans.length > 0 ?
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-700">
            {t("studio.composition.brandPlacement")}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {brandPlans.map((p) => (
              <li key={`${p.sceneId}-${p.brandId}`}>{p.brandName}</li>
            ))}
          </ul>
        </div>
      : null}

      {!scene && plan.compositionWarnings.length > 0 ?
        <ul className="mt-4 space-y-1 text-xs text-amber-900">
          {plan.compositionWarnings
            .filter((w) => !w.sceneId)
            .map((w, i) => (
              <li key={`${w.code}-${i}`}>{t(w.messageKey as never, w.params as never)}</li>
            ))}
        </ul>
      : null}
    </section>
  );
}
