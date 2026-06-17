"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { OnboardingProgress, OnboardingStepId } from "@/server/onboarding/onboarding-service";

const STEP_KEYS: Record<OnboardingStepId, string> = {
  create_account: "onboarding.step.createAccount",
  complete_profile: "onboarding.step.completeProfile",
  create_first_project: "onboarding.step.createFirstProject",
  generate_first_asset: "onboarding.step.generateFirstAsset",
  complete_first_render: "onboarding.step.completeFirstRender",
};

export function OnboardingChecklist({ className = "" }: { className?: string }) {
  const t = useActiveTranslator();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/me/onboarding", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { progress: OnboardingProgress };
      setProgress(data.progress);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!progress || progress.isComplete) return null;

  return (
    <section
      className={`rounded-2xl border border-emerald-200/40 bg-emerald-950/30 p-5 ${className}`}
      data-testid="onboarding-checklist"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
            {t("onboarding.label" as never)}
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">{t("onboarding.title" as never)}</h3>
        </div>
        <span className="text-sm font-semibold text-emerald-200">
          {progress.percentComplete}%
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {progress.steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3 text-sm text-white/85">
            <span aria-hidden className={step.completed ? "text-emerald-300" : "text-white/40"}>
              {step.completed ? "✓" : "○"}
            </span>
            {step.completed || !step.href ?
              <span className={step.completed ? "line-through opacity-70" : ""}>
                {t(STEP_KEYS[step.id] as never)}
              </span>
            : <Link href={step.href} className="font-medium text-emerald-200 hover:underline">
                {t(STEP_KEYS[step.id] as never)}
              </Link>
            }
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-white/55">{t("onboarding.rewardHint" as never)}</p>
    </section>
  );
}
