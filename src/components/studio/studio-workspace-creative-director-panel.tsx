"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  listProductExperiencesByFamily,
  orchestrateCreativeDirector,
  type StudioProductExperienceFamily,
  type StudioProductMode,
} from "@/lib/studio-creative-director";
import type { StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
};

const FAMILIES: StudioProductExperienceFamily[] = [
  "PEOPLE",
  "BUSINESS",
  "SOCIAL",
  "CREATIVE",
  "IDENTITY",
];

const MODES: StudioProductMode[] = ["QUICK", "PROFESSIONAL", "DIRECTOR"];

/**
 * Thin Adaptive Workspace surface for S.6F Creative Director orchestration.
 * Does not generate media, charge credits, or rewrite Continuity/Matrix.
 */
export function StudioWorkspaceCreativeDirectorPanel({ storyboard }: Props) {
  const t = useActiveTranslator();
  const [mode, setMode] = useState<StudioProductMode>("QUICK");
  const [experienceId, setExperienceId] = useState<string>("PEOPLE_LINKEDIN_PHOTO");
  const [family, setFamily] = useState<StudioProductExperienceFamily>("PEOPLE");

  const experiences = useMemo(() => listProductExperiencesByFamily(family), [family]);

  const orchestration = useMemo(
    () =>
      orchestrateCreativeDirector({
        experienceId,
        mode,
      }),
    [experienceId, mode]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.creativeDirector.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.creativeDirector.subtitle")}</p>
        <p className="mt-2 text-xs text-zinc-500">
          {t("studio.creativeDirector.projectHint", { title: storyboard.title || storyboard.id })}
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.creativeDirector.section.mode")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                mode === m
                  ? "rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700"
              }
            >
              {t(`studio.creativeDirector.mode.${m}` as "studio.creativeDirector.mode.QUICK")}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">{t("studio.creativeDirector.mode.hint")}</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.creativeDirector.section.experience")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {FAMILIES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFamily(f);
                const first = listProductExperiencesByFamily(f)[0];
                if (first) setExperienceId(first.experienceId);
              }}
              className={
                family === f
                  ? "rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-medium text-white"
                  : "rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700"
              }
            >
              {t(`studio.creativeDirector.family.${f}` as "studio.creativeDirector.family.PEOPLE")}
            </button>
          ))}
        </div>
        <label className="block text-xs text-zinc-600">
          {t("studio.creativeDirector.chooseExperience")}
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            value={experienceId}
            onChange={(e) => setExperienceId(e.target.value)}
          >
            {experiences.map((exp) => (
              <option key={exp.experienceId} value={exp.experienceId}>
                {exp.label} ({exp.status})
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.creativeDirector.section.plan")}
        </h3>
        <p className="text-xs text-zinc-600 break-words">{orchestration.summary}</p>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              {t("studio.creativeDirector.field.matrix")}
            </dt>
            <dd className="font-medium text-zinc-900">
              {orchestration.handoff.matrixExperienceId}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              {t("studio.creativeDirector.field.continuity")}
            </dt>
            <dd className="font-medium text-zinc-900">
              {orchestration.handoff.continuityRequirements}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              {t("studio.creativeDirector.field.goal")}
            </dt>
            <dd className="font-medium text-zinc-900">{orchestration.experience.creativeGoal}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              {t("studio.creativeDirector.field.planners")}
            </dt>
            <dd className="font-medium text-zinc-900">
              {orchestration.recommendedPlanners.slice(0, 4).join(", ") || "—"}
            </dd>
          </div>
        </dl>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
          {orchestration.plan.workflowSteps.map((step) => (
            <li key={step}>{step.replace(/_/g, " ")}</li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
        <h3 className="text-sm font-semibold text-amber-950">
          {t("studio.creativeDirector.section.boundaries")}
        </h3>
        <p className="mt-2 text-sm text-amber-900">{t("studio.creativeDirector.boundaries.body")}</p>
      </section>
    </div>
  );
}
