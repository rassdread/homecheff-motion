"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  CHARACTER_WIZARD_DEFAULTS,
  enrichCharacterFromWizard,
  type EnrichedCharacterConcept,
} from "@/lib/studio-character-wizard";
import type { StudioCharacterWizardAnswers } from "@/types/studio-production-brief-v3";

type QuestionId = keyof StudioCharacterWizardAnswers;

const QUESTIONS: Array<{ id: QuestionId; options: StudioCharacterWizardAnswers[QuestionId][] }> = [
  { id: "type", options: ["human", "mascot", "animal", "fantasy", "product"] },
  { id: "presentation", options: ["male", "female", "neutral", "brand"] },
  { id: "ageEnergy", options: ["child", "young", "adult", "older", "timeless"] },
  { id: "style", options: ["realistic", "cinematic", "cartoon", "anime", "pixar-like"] },
  { id: "coreTrait", options: ["friendly", "professional", "funny", "strong", "smart"] },
];

type Props = {
  onComplete?: (concept: EnrichedCharacterConcept) => void;
};

export function StudioCharacterWizardPanel({ onComplete }: Props) {
  const t = useActiveTranslator();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<StudioCharacterWizardAnswers>(CHARACTER_WIZARD_DEFAULTS);
  const [concept, setConcept] = useState<EnrichedCharacterConcept | null>(null);

  const q = QUESTIONS[step];
  if (!q) return null;

  if (concept) {
    return (
      <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4" data-testid="studio-character-wizard-result">
        <p className="text-sm font-semibold text-zinc-900">{concept.name}</p>
        <ul className="text-xs text-zinc-600">
          <li>{concept.clothing}</li>
          <li>{concept.personality}</li>
          <li>{concept.voiceStyle}</li>
        </ul>
        <p className="text-xs font-medium text-amber-800">
          {t("studio.characterWizard.credits" as never, { credits: concept.estimatedCredits } as never)}
        </p>
        <button
          type="button"
          className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
          onClick={() => onComplete?.(concept)}
        >
          {t("studio.characterWizard.save" as never)}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="studio-character-wizard">
      <p className="text-xs font-semibold uppercase text-zinc-500">
        {t("studio.characterWizard.step" as never, { step: step + 1, total: 5 } as never)}
      </p>
      <p className="text-sm font-medium text-zinc-900">{t(`studio.characterWizard.q.${q.id}` as never)}</p>
      <div className="flex flex-wrap gap-2">
        {q.options.map((opt) => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => {
              const next = { ...answers, [q.id]: opt };
              setAnswers(next);
              if (step >= 4) {
                setConcept(enrichCharacterFromWizard(next));
              } else {
                setStep(step + 1);
              }
            }}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-[#006D52]"
          >
            {t(`studio.characterWizard.${q.id}.${opt}` as never)}
          </button>
        ))}
      </div>
    </div>
  );
}
