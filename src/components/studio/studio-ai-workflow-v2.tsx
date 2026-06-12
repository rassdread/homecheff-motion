"use client";

import { useMemo, useState } from "react";
import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";
import { useActiveTranslator } from "@/i18n/client";
import { storeStudioWorkflowInHc } from "@/lib/hc-workflow-v2";
import { persistHomeCheffProject } from "@/lib/homecheff-project-persist";
import { buildStudioProjectInventory } from "@/lib/studio-project-inventory";
import {
  buildStudioStorylineFromIdea,
  rewriteStudioStoryline,
  type StudioGeneratedStoryline,
  type StudioStoryRewriteMode,
} from "@/lib/studio-story-generator";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

type StepId =
  | "idea"
  | "inventory"
  | "missing"
  | "direction"
  | "plan"
  | "characters"
  | "review"
  | "generate";

const STEPS: StepId[] = ["idea", "inventory", "missing", "direction", "plan", "characters", "review", "generate"];

type Props = {
  hcProject?: HomeCheffProjectPackage | null;
  onComplete?: (story: StudioGeneratedStoryline) => void;
};

export function StudioAiWorkflowV2({ hcProject, onComplete }: Props) {
  const t = useActiveTranslator();
  const [step, setStep] = useState<StepId>("idea");
  const [idea, setIdea] = useState("");
  const [goal, setGoal] = useState("sell");
  const [style, setStyle] = useState("cinematic");
  const [audience, setAudience] = useState("adults");
  const [characterStrategy, setCharacterStrategy] = useState<"existing" | "manual" | "ai">("ai");
  const [animationStyle, setAnimationStyle] = useState("cinematic");
  const [busy, setBusy] = useState(false);
  const [story, setStory] = useState<StudioGeneratedStoryline | null>(null);

  const inventory = useMemo(() => buildStudioProjectInventory(hcProject), [hcProject]);

  const persistWorkflow = (patch: Partial<Parameters<typeof storeStudioWorkflowInHc>[1]>) => {
    if (!hcProject) return;
    persistHomeCheffProject(storeStudioWorkflowInHc(hcProject, patch));
  };

  const generateStory = async (mode: StudioStoryRewriteMode = "regenerate") => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    const next =
      story && mode !== "regenerate" ? rewriteStudioStoryline(story, mode) : buildStudioStorylineFromIdea(idea);
    setStory(next);
    persistWorkflow({
      phase: "approve",
      idea,
      goal,
      style,
      targetAudience: audience,
      characterStrategy,
      animationStyle,
      inventorySummary: {
        available: inventory.available,
        missing: inventory.missing,
        optional: inventory.optional,
      },
      storyline: next,
    });
    setBusy(false);
  };

  const stepIndex = STEPS.indexOf(step);

  if (busy) {
    return (
      <div className="flex justify-center py-12">
        <HomeCheffOrbitLoader state="generating" size="lg" message={t("studio.workflow.generating" as never)} />
      </div>
    );
  }

  return (
    <section className={`space-y-4 ${studioVisual.cardOnDarkMuted} p-5`} data-testid="studio-ai-workflow-v2">
      <div className="flex flex-wrap gap-1">
        {STEPS.map((id, i) => (
          <span
            key={id}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              id === step ? "bg-emerald-500/30 text-white" : i < stepIndex ? "bg-white/10 text-white/70" : "text-white/40"
            }`}
          >
            {t(`studio.workflow.step.${id}` as never)}
          </span>
        ))}
      </div>

      <p className={`text-xs ${studioVisual.bodyOnDark}`}>{t("studio.workflow.aiLead" as never)}</p>

      {step === "idea" ?
        <>
          <h2 className={`text-lg font-bold ${studioVisual.headingOnDark}`}>{t("studio.story.title" as never)}</h2>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
            placeholder={t("studio.story.ideaPlaceholder" as never)}
          />
          <button
            type="button"
            disabled={!idea.trim()}
            className={`min-h-11 disabled:opacity-40 ${studioVisual.btnGradientPrimary}`}
            onClick={() => {
              persistWorkflow({ phase: "collect", idea });
              setStep("inventory");
            }}
          >
            {t("editor.flow.continue" as never)}
          </button>
        </>
      : null}

      {step === "inventory" ?
        <>
          <h2 className={`text-lg font-bold ${studioVisual.headingOnDark}`}>{t("studio.workflow.inventoryTitle" as never)}</h2>
          <p className={`text-sm ${studioVisual.bodyOnDark}`}>{t("studio.workflow.inventoryLead" as never)}</p>
          <ul className="list-inside list-disc text-sm text-white/80">
            {inventory.available.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button type="button" className={studioVisual.btnGradientPrimary} onClick={() => setStep("missing")}>
            {t("editor.flow.continue" as never)}
          </button>
        </>
      : null}

      {step === "missing" ?
        <>
          <h2 className={`text-lg font-bold ${studioVisual.headingOnDark}`}>{t("studio.workflow.missingTitle" as never)}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-amber-300">{t("studio.workflow.missingLabel" as never)}</p>
              <ul className="mt-1 text-sm text-white/80">
                {inventory.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-300">{t("studio.workflow.optionalLabel" as never)}</p>
              <ul className="mt-1 text-sm text-white/80">
                {inventory.optional.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
          <button type="button" className={studioVisual.btnGradientPrimary} onClick={() => setStep("direction")}>
            {t("editor.flow.continue" as never)}
          </button>
        </>
      : null}

      {step === "direction" ?
        <>
          <h2 className={`text-lg font-bold ${studioVisual.headingOnDark}`}>{t("studio.workflow.directionTitle" as never)}</h2>
          <label className="block text-sm text-white/80">
            {t("studio.workflow.style" as never)}
            <select value={style} onChange={(e) => setStyle(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-2 py-2 text-sm text-white">
              {["realistic", "cinematic", "cartoon", "manga", "anime", "pixar-like"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-white/80">
            {t("studio.workflow.goal" as never)}
            <select value={goal} onChange={(e) => setGoal(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-2 py-2 text-sm text-white">
              {["sell", "explain", "inspire", "educate", "recruit", "entertain"].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-white/80">
            {t("studio.workflow.audience" as never)}
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-2 py-2 text-sm text-white">
              {["children", "youth", "adults", "entrepreneurs", "global"].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={studioVisual.btnGradientPrimary}
            onClick={() => {
              persistWorkflow({ phase: "plan", style, goal, targetAudience: audience });
              setStep("plan");
              void generateStory("regenerate");
            }}
          >
            {t("studio.workflow.generatePlan" as never)}
          </button>
        </>
      : null}

      {step === "plan" && story ?
        <>
          <h2 className={`text-xl font-bold ${studioVisual.headingOnDark}`}>{story.title}</h2>
          <p className={`text-sm ${studioVisual.bodyOnDark}`}>{story.logline}</p>
          <div className="flex flex-wrap gap-2">
            {(["regenerate", "shorter", "commercial", "emotional", "cinematic"] as StudioStoryRewriteMode[]).map((mode) => (
              <button key={mode} type="button" className={`min-h-11 px-3 text-xs ${studioVisual.btnOutline}`} onClick={() => void generateStory(mode)}>
                {t(`studio.story.rewrite.${mode}` as never)}
              </button>
            ))}
            <button type="button" className={studioVisual.btnGradientPrimary} onClick={() => setStep("characters")}>
              {t("editor.flow.continue" as never)}
            </button>
          </div>
        </>
      : null}

      {step === "characters" ?
        <>
          <h2 className={`text-lg font-bold ${studioVisual.headingOnDark}`}>{t("studio.workflow.charactersTitle" as never)}</h2>
          <div className="flex flex-wrap gap-2">
            {(["existing", "manual", "ai"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setCharacterStrategy(opt)}
                className={characterStrategy === opt ? studioVisual.btnGradientPrimary : studioVisual.btnOutline}
              >
                {t(`studio.workflow.characterStrategy.${opt}` as never)}
              </button>
            ))}
          </div>
          {characterStrategy === "ai" ?
            <label className="block text-sm text-white/80">
              {t("studio.workflow.animationStyle" as never)}
              <select
                value={animationStyle}
                onChange={(e) => setAnimationStyle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-2 py-2 text-sm text-white"
              >
                {["realistic", "cartoon", "manga", "pixar-like", "anime", "cinematic"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          : null}
          <button
            type="button"
            className={studioVisual.btnGradientPrimary}
            onClick={() => {
              persistWorkflow({ characterStrategy, animationStyle });
              setStep("review");
            }}
          >
            {t("editor.flow.continue" as never)}
          </button>
        </>
      : null}

      {step === "review" && story ?
        <>
          <h2 className={`text-lg font-bold ${studioVisual.headingOnDark}`}>{t("studio.workflow.reviewTitle" as never)}</h2>
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {story.scenes.map((scene) => (
              <li key={scene.id} className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-white/80">
                {scene.title}: {scene.script.slice(0, 80)}…
              </li>
            ))}
          </ul>
          <button type="button" className={studioVisual.btnGradientPrimary} onClick={() => setStep("generate")}>
            {t("studio.workflow.approvePlan" as never)}
          </button>
        </>
      : null}

      {step === "generate" ?
        <>
          <h2 className={`text-lg font-bold ${studioVisual.headingOnDark}`}>{t("studio.workflow.generateTitle" as never)}</h2>
          <p className={`text-sm ${studioVisual.bodyOnDark}`}>{t("studio.workflow.generateLead" as never)}</p>
          <button
            type="button"
            className={studioVisual.btnGradientPrimary}
            onClick={() => {
              if (story) {
                persistWorkflow({ phase: "generate", approvedAt: new Date().toISOString(), storyline: story });
                onComplete?.(story);
              }
            }}
          >
            {t("studio.workflow.openStudio" as never)}
          </button>
        </>
      : null}
    </section>
  );
}
