"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StudioGuidedQuestions } from "@/components/studio/studio-guided-questions";
import { StudioDirectorAdaptivePresentation } from "@/components/studio/director-presentation/studio-director-adaptive-presentation";
import { toDirectorPackNodes } from "@/components/studio/director-presentation/studio-director-pack-views";
import { useActiveTranslator } from "@/i18n/client";
import {
  acceptCoachOnExperience,
  applyGuidedAnswer,
  buildDirectorWorkspaceHref,
  buildExperiencePackHref,
  continueExperience,
  getGuidedQuestionsForPack,
  getProductExperience,
  isPackBlockedFromConsumerGenerate,
  isStudioProductExperienceId,
  missingPackUserMessage,
  openExperience,
  P0_EXPERIENCE_PACKS,
  saveConsumerExperienceSession,
  type CreativeIntentAnswers,
  type StudioProductExperienceId,
  type StudioProductMode,
} from "@/lib/studio-creative-director";

function parseMode(raw: string | null): StudioProductMode {
  const v = (raw ?? "quick").toLowerCase();
  if (v === "professional") return "PROFESSIONAL";
  if (v === "director") return "DIRECTOR";
  return "QUICK";
}

export function StudioExperiencePackFunnel() {
  const t = useActiveTranslator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const experienceParam = searchParams.get("experience");
  const entryFan = searchParams.get("entryFan") ?? searchParams.get("intent");
  const photoIntent = searchParams.get("photoIntent");
  const preset = searchParams.get("preset");
  const flow = searchParams.get("flow");
  const mode = parseMode(searchParams.get("mode"));

  const [answers, setAnswers] = useState<CreativeIntentAnswers>({});
  const [error, setError] = useState<string | null>(null);

  const opened = useMemo(() => {
    return openExperience({
      experienceId: experienceParam,
      entryFan,
      photoIntent,
      motionPreset: preset,
      characterStudioFlow: flow,
      videoIntent: searchParams.get("intent"),
      mode,
      answers,
    });
  }, [experienceParam, entryFan, photoIntent, preset, flow, mode, answers, searchParams]);

  const experienceId = opened.orchestration?.experience.experienceId ?? null;
  const questions = useMemo(() => {
    if (!experienceId) return [];
    return getGuidedQuestionsForPack({ experienceId, mode });
  }, [experienceId, mode]);

  useEffect(() => {
    if (!opened.ok || !opened.orchestration || !experienceId) return;
    saveConsumerExperienceSession({
      version: 1,
      experienceId,
      mode: opened.mode,
      answers,
      matrixExperienceId: opened.orchestration.handoff.matrixExperienceId,
      continuityStrategy: opened.continuityStrategy,
      sourceAsset: opened.sourceAsset,
      returnTo: opened.returnTo,
      updatedAt: Date.now(),
    });
  }, [opened, experienceId, answers]);

  if (!experienceParam && !entryFan && !photoIntent && !preset && !flow) {
    const packs = toDirectorPackNodes(P0_EXPERIENCE_PACKS);
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-10">
        <StudioDirectorAdaptivePresentation
          packs={packs}
          productMode="QUICK"
          linkMode
          title={t("studio.experience.chooser.title")}
          subtitle={t("studio.experience.chooser.subtitle")}
        />
      </div>
    );
  }

  if (opened.blocked || !opened.orchestration || !experienceId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <h1 className="text-xl font-bold text-zinc-900">{t("studio.experience.unavailable.title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {opened.blockReason ??
            (experienceParam && isStudioProductExperienceId(experienceParam)
              ? missingPackUserMessage(experienceParam)
              : t("studio.experience.unavailable.generic"))}
        </p>
        <Link href="/studio/experience" className="mt-6 inline-block text-sm font-semibold text-[#006D52]">
          {t("studio.experience.unavailable.browse")}
        </Link>
      </div>
    );
  }

  const orchestration = opened.orchestration;
  const label = getProductExperience(experienceId).label;

  const onAnswer = (question: Parameters<typeof applyGuidedAnswer>[1], value: string | boolean) => {
    setAnswers((prev) => applyGuidedAnswer(prev, question, value));
    setError(null);
  };

  const goGenerate = () => {
    if (isPackBlockedFromConsumerGenerate(experienceId)) {
      setError(missingPackUserMessage(experienceId));
      return;
    }
    const next = continueExperience({
      experienceId,
      mode,
      answers,
    });
    if (!next.ok || !next.nextHref) {
      setError(next.blockReason ?? "Could not continue.");
      return;
    }
    saveConsumerExperienceSession({
      version: 1,
      experienceId,
      mode: next.mode,
      answers,
      matrixExperienceId: next.orchestration!.handoff.matrixExperienceId,
      continuityStrategy: next.continuityStrategy,
      sourceAsset: next.sourceAsset,
      returnTo: next.returnTo,
      updatedAt: Date.now(),
    });
    router.push(next.nextHref);
  };

  const upgradeProfessional = () => {
    router.push(
      buildExperiencePackHref({
        experienceId,
        mode: "PROFESSIONAL",
        entryFan: entryFan ?? undefined,
      })
    );
  };

  const upgradeDirector = () => {
    const href = buildDirectorWorkspaceHref({
      version: 1,
      experienceId,
      mode: "DIRECTOR",
      answers,
      matrixExperienceId: orchestration.handoff.matrixExperienceId,
      continuityStrategy: opened.continuityStrategy,
      sourceAsset: null,
      returnTo: null,
      updatedAt: Date.now(),
    });
    router.push(href);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:py-10">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
          {mode === "QUICK" ? "Quick" : mode === "PROFESSIONAL" ? "Professional" : "Director"}
        </p>
        <h1 className="text-2xl font-bold text-zinc-900">{label}</h1>
        <p className="text-sm text-zinc-600">
          Answer a few simple questions. We prepare your creative plan — no prompts or providers to
          configure.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <StudioGuidedQuestions
          questions={questions}
          values={answers as Record<string, string | boolean | null | undefined>}
          onChange={onAnswer}
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Optional ideas</h2>
        <p className="text-xs text-zinc-500">Suggestions only — nothing is applied until you tap one.</p>
        <ul className="flex flex-wrap gap-2">
          {orchestration.coachSuggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="min-h-10 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-[#006D52]/40"
                onClick={() => {
                  const { accept } = acceptCoachOnExperience({
                    experienceId,
                    mode,
                    answers,
                    suggestion: s,
                  });
                  setAnswers(accept.answers);
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 space-y-1">
        <p>
          <span className="font-medium text-zinc-800">Plan:</span> {orchestration.summary}
        </p>
        <p>
          <span className="font-medium text-zinc-800">Continuity:</span> {opened.continuityStrategy}
        </p>
        <p>
          <span className="font-medium text-zinc-800">Engine:</span>{" "}
          {orchestration.handoff.matrixExperienceId}
        </p>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={goGenerate}
          className="min-h-12 rounded-full bg-[#006D52] px-6 text-sm font-semibold text-white hover:bg-[#005a44]"
        >
          Continue to generate
        </button>
        {mode === "QUICK" ? (
          <button
            type="button"
            onClick={upgradeProfessional}
            className="min-h-12 rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800"
          >
            More options (Professional)
          </button>
        ) : null}
        <button
          type="button"
          onClick={upgradeDirector}
          className="min-h-12 rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800"
        >
          Open in Director
        </button>
      </div>
    </div>
  );
}

/** Type re-export helper for experience id narrowing in chooser. */
export type { StudioProductExperienceId };
