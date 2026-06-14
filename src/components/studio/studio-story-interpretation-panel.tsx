"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  answerStoryQuestions,
  applyStoryDirection,
  interpretStoryIdea,
  type StudioStoryInterpretation,
} from "@/lib/studio-story-interpretation";
import type { StudioProductionBriefSelections } from "@/types/studio-production-brief-v3";
import type { StudioStoryPlan } from "@/types/studio-production-brief-v3";
import { buildStoryPlanFromInterpretation } from "@/lib/studio-build-story-plan";

type Props = {
  idea: string;
  selections: StudioProductionBriefSelections;
  locale: string;
  onPlanReady: (plan: StudioStoryPlan, interpretation: StudioStoryInterpretation) => void;
};

export function StudioStoryInterpretationPanel({
  idea,
  selections,
  locale,
  onPlanReady,
}: Props) {
  const t = useActiveTranslator();
  const [interpretation, setInterpretation] = useState<StudioStoryInterpretation>(() =>
    interpretStoryIdea({ idea, selections, locale })
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const selectedDirection = useMemo(
    () => interpretation.directions.find((d) => d.id === interpretation.selectedDirectionId),
    [interpretation]
  );

  const confirmScenes = () => {
    const plan = buildStoryPlanFromInterpretation({ interpretation, selections });
    onPlanReady(plan, interpretation);
  };

  return (
    <div className="space-y-5" data-testid="studio-story-interpretation-panel">
      <section className="rounded-xl border border-violet-200 bg-violet-50/80 p-4">
        <h3 className="text-sm font-semibold text-violet-950">
          {t("studio.storyInterpretation.title" as never)}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-violet-900">{interpretation.interpretation}</p>
        <dl className="mt-3 grid gap-2 text-xs text-violet-800 sm:grid-cols-2">
          <div>
            <dt className="font-semibold">{t("studio.storyInterpretation.concept" as never)}</dt>
            <dd>{interpretation.coreConcept}</dd>
          </div>
          <div>
            <dt className="font-semibold">{t("studio.storyInterpretation.narrativeType" as never)}</dt>
            <dd>{interpretation.narrativeType}</dd>
          </div>
          <div>
            <dt className="font-semibold">{t("studio.storyInterpretation.emotion" as never)}</dt>
            <dd>{interpretation.emotionalDirection}</dd>
          </div>
          <div>
            <dt className="font-semibold">{t("studio.storyInterpretation.audience" as never)}</dt>
            <dd>{interpretation.audience}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.storyInterpretation.directions" as never)}
        </h3>
        <ul className="mt-2 space-y-2">
          {interpretation.directions.map((dir) => (
            <li key={dir.id}>
              <button
                type="button"
                className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                  interpretation.selectedDirectionId === dir.id
                    ? "border-[#0067B1] bg-[#0067B1]/5 ring-1 ring-[#0067B1]/30"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
                onClick={() => setInterpretation(applyStoryDirection(interpretation, dir.id))}
              >
                <p className="font-semibold text-zinc-900">{dir.title}</p>
                <p className="mt-1 text-zinc-600">{dir.summary}</p>
                <p className="mt-1 text-xs text-zinc-500">{dir.emotionalBeat}</p>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {interpretation.questions.length > 0 ?
        <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <h3 className="text-sm font-semibold text-amber-950">
            {t("studio.storyInterpretation.questions" as never)}
          </h3>
          <ul className="mt-2 space-y-3">
            {interpretation.questions.map((q) => (
              <li key={q.id}>
                <p className="text-sm font-medium text-amber-900">{q.prompt}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        answers[q.id] === opt
                          ? "border-amber-600 bg-amber-600 text-white"
                          : "border-amber-300 bg-white text-amber-900"
                      }`}
                      onClick={() => {
                        const nextAnswers = { ...answers, [q.id]: opt };
                        setAnswers(nextAnswers);
                        setInterpretation(answerStoryQuestions(interpretation, nextAnswers));
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      : null}

      <section>
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.storyInterpretation.scenes" as never)}
        </h3>
        {selectedDirection ?
          <p className="mt-1 text-xs text-zinc-500">
            {t("studio.storyInterpretation.directionSelected" as never, {
              title: selectedDirection.title,
            } as never)}
          </p>
        : null}
        <ul className="mt-2 space-y-2">
          {interpretation.scenes.map((scene, index) => (
            <li key={scene.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
              <p className="font-semibold text-zinc-900">
                {t("studio.buildStory.sceneLabel" as never, { index: index + 1 } as never)}: {scene.title}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{scene.purpose}</p>
              <p className="mt-1 text-zinc-700">{scene.visualIdea}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {scene.emotion} · {scene.characters.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        className="rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-5 py-2.5 text-sm font-semibold text-white"
        onClick={confirmScenes}
      >
        {t("studio.storyInterpretation.confirmScenes" as never)}
      </button>
    </div>
  );
}
