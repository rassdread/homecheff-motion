"use client";

import { useMemo, useState } from "react";
import { analyzeSceneImagePlanner } from "@/lib/studio-scene-image-planner";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import { normalizeStudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  styleProfile: StudioPromptStyleProfile;
  directorProfile: StudioDirectorProfile;
};

function readinessClasses(readiness: string): string {
  switch (readiness) {
    case "ready":
      return "bg-emerald-50 text-emerald-800";
    case "needs_attention":
      return "bg-amber-50 text-amber-900";
    default:
      return "bg-red-50 text-red-800";
  }
}

export function StudioSceneImagePlannerPanel({
  storyboard,
  styleProfile,
  directorProfile,
}: Props) {
  const t = useActiveTranslator();
  const profile = normalizeStudioPromptStyleProfile(styleProfile);
  const director = normalizeStudioDirectorProfile(directorProfile);
  const report = useMemo(
    () =>
      analyzeSceneImagePlanner({
        storyboard,
        styleProfile: profile,
        directorProfile: director,
      }),
    [storyboard, profile, director]
  );
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(
    report.scenes[0]?.requirements.sceneId ?? null
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey(null);
    }
  };

  if (report.scenes.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl border border-[#006D52]/20 bg-gradient-to-br from-[#006D52]/5 to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">
            {t("studio.imagePlanner.title")}
          </p>
          <p className="mt-0.5 text-xs text-zinc-600">{t("studio.imagePlanner.hint")}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${readinessClasses(report.readiness)}`}
        >
          {t(report.readinessLabelKey as TranslationKey)}
        </span>
      </div>

      <p className="mt-3 text-xs text-zinc-700">
        {t("studio.imagePlanner.consistencyScore", { score: report.visualConsistencyScore })} ·{" "}
        {t("studio.imagePlanner.factor.characters", {
          score: report.consistencyFactors.characterConsistency,
        })}{" "}
        ·{" "}
        {t("studio.imagePlanner.factor.locations", {
          score: report.consistencyFactors.locationConsistency,
        })}{" "}
        ·{" "}
        {t("studio.imagePlanner.factor.props", {
          score: report.consistencyFactors.propConsistency,
        })}{" "}
        ·{" "}
        {t("studio.imagePlanner.factor.transitions", {
          score: report.consistencyFactors.transitionConsistency,
        })}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-100 bg-white/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.imagePlanner.registry.characters")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {report.registries.characters.length === 0 ?
              <span className="text-xs text-zinc-500">{t("studio.imagePlanner.registry.empty")}</span>
            : report.registries.characters.map((c) => (
                <span
                  key={c.id}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-800"
                >
                  {c.name}
                  {c.isMascot ? " ★" : ""}
                </span>
              ))
            }
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-white/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.imagePlanner.registry.locations")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {report.registries.locations.length === 0 ?
              <span className="text-xs text-zinc-500">{t("studio.imagePlanner.registry.empty")}</span>
            : report.registries.locations.map((loc) => (
                <span
                  key={loc.id}
                  className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-900"
                >
                  {loc.name}
                </span>
              ))
            }
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-white/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.imagePlanner.registry.props")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {report.registries.props.length === 0 ?
              <span className="text-xs text-zinc-500">{t("studio.imagePlanner.registry.empty")}</span>
            : report.registries.props.map((p) => (
                <span
                  key={p.id}
                  className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-900"
                >
                  {p.name}
                </span>
              ))
            }
          </div>
        </div>
      </div>

      {report.warnings.length > 0 ?
        <ul className="mt-4 space-y-2">
          {report.warnings.map((warning, index) => (
            <li
              key={`${warning.code}-${index}`}
              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
            >
              {t(warning.messageKey as TranslationKey, warning.params)}
            </li>
          ))}
        </ul>
      : null}

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("studio.imagePlanner.scenesTitle")}
        </p>
        <ol className="mt-2 space-y-2">
          {report.scenes.map((plan) => {
            const req = plan.requirements;
            const expanded = expandedSceneId === req.sceneId;
            return (
              <li
                key={req.sceneId}
                className="rounded-xl border border-zinc-100 bg-white/90 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSceneId((id) => (id === req.sceneId ? null : req.sceneId))
                  }
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                >
                  <span className="font-semibold text-zinc-900">
                    {t("studio.imagePlanner.sceneLabel", { index: req.order + 1 })} — {req.title}
                  </span>
                  <span className="text-xs text-[#006D52]">{req.cameraFraming}</span>
                </button>
                {expanded ?
                  <div className="border-t border-zinc-100 px-3 py-3 text-xs text-zinc-700">
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-zinc-800">
                          {t("studio.imagePlanner.req.characters")}
                        </dt>
                        <dd>
                          {req.characterNames.length > 0 ?
                            req.characterNames.join(", ")
                          : t("studio.imagePlanner.req.none")}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-800">
                          {t("studio.imagePlanner.req.location")}
                        </dt>
                        <dd>{req.locationName ?? t("studio.imagePlanner.req.none")}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-800">
                          {t("studio.imagePlanner.req.objects")}
                        </dt>
                        <dd>
                          {req.objectNames.length > 0 ?
                            req.objectNames.join(", ")
                          : t("studio.imagePlanner.req.none")}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-800">
                          {t("studio.imagePlanner.req.mood")}
                        </dt>
                        <dd>{req.visualMood}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-800">
                          {t("studio.imagePlanner.req.time")}
                        </dt>
                        <dd>{req.timeOfDay}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-zinc-800">
                          {t("studio.imagePlanner.req.shot")}
                        </dt>
                        <dd>{req.cameraFraming}</dd>
                      </div>
                    </dl>

                    <p className="mt-3 font-semibold text-zinc-800">
                      {t("studio.imagePlanner.aiDescription")}
                    </p>
                    <p className="mt-1 rounded-lg bg-zinc-50 px-2 py-2 italic text-zinc-800">
                      {plan.aiSceneDescription}
                    </p>

                    <div className="mt-3 space-y-2">
                      {(
                        [
                          ["image", plan.exports.imageGenerationPrompt],
                          ["vidu", plan.exports.viduContextPrompt],
                          ["visual", plan.exports.storyboardVisualPrompt],
                        ] as const
                      ).map(([kind, text]) => (
                        <div key={kind} className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-zinc-800">
                              {t(`studio.imagePlanner.export.${kind}` as TranslationKey)}
                            </span>
                            <button
                              type="button"
                              onClick={() => void copyText(`${req.sceneId}-${kind}`, text)}
                              className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-700"
                            >
                              {copiedKey === `${req.sceneId}-${kind}`
                                ? t("studio.imagePlanner.export.copied")
                                : t("studio.imagePlanner.export.copy")}
                            </button>
                          </div>
                          <p className="mt-1 line-clamp-3 text-[11px] text-zinc-600">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
