"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  enrichCharacterFromWizard,
  enrichLocationFromWizard,
  enrichPropFromWizard,
  enrichWorldFromWizard,
  LOCATION_WIZARD_DEFAULTS,
  PROP_WIZARD_DEFAULTS,
  WORLD_WIZARD_DEFAULTS,
  type EnrichedCharacterConcept,
  type EnrichedLocationConcept,
  type EnrichedPropConcept,
  type EnrichedWorldConcept,
  type LocationWizardAnswers,
  type PropWizardAnswers,
  type WorldWizardAnswers,
} from "@/lib/studio-brief-asset-wizards";
import { CHARACTER_WIZARD_DEFAULTS } from "@/lib/studio-character-wizard";
import type { StudioCharacterWizardAnswers } from "@/types/studio-production-brief-v3";

export type BriefWizardKind = "character" | "location" | "prop" | "world";

type WizardConcept =
  | EnrichedCharacterConcept
  | EnrichedLocationConcept
  | EnrichedPropConcept
  | EnrichedWorldConcept;

type Props = {
  kind: BriefWizardKind;
  onComplete?: (concept: WizardConcept) => void;
  onCancel?: () => void;
};

type QuestionDef = { id: string; options: string[] };

function questionsForKind(kind: BriefWizardKind): QuestionDef[] {
  if (kind === "character") {
    return [
      { id: "type", options: ["human", "mascot", "animal", "fantasy", "product"] },
      { id: "presentation", options: ["male", "female", "neutral", "brand"] },
      { id: "ageEnergy", options: ["child", "young", "adult", "older", "timeless"] },
      { id: "style", options: ["realistic", "cinematic", "cartoon", "anime", "pixar-like"] },
      { id: "coreTrait", options: ["friendly", "professional", "funny", "strong", "smart"] },
    ];
  }
  if (kind === "location") {
    return [
      { id: "setting", options: ["indoor", "outdoor", "city", "nature", "shop", "fantasy"] },
      { id: "mood", options: ["warm", "modern", "cinematic", "playful", "premium"] },
      { id: "time", options: ["morning", "day", "evening", "night"] },
      { id: "detail", options: ["simple", "realistic", "rich"] },
      { id: "brand", options: ["none", "subtle", "visible"] },
    ];
  }
  if (kind === "prop") {
    return [
      { id: "category", options: ["product", "food", "clothing", "tool", "logo", "object"] },
      { id: "importance", options: ["background", "supporting", "hero"] },
      { id: "style", options: ["realistic", "cartoon", "premium", "playful"] },
      { id: "brand", options: ["none", "subtle", "clear"] },
      { id: "use", options: ["held", "worn", "placed", "displayed", "animated"] },
    ];
  }
  return [
    { id: "style", options: ["realistic", "cartoon", "cinematic", "anime", "pixar-like"] },
    { id: "colorMood", options: ["warm", "cool", "neutral", "vibrant", "muted"] },
    { id: "environment", options: ["urban", "nature", "studio", "fantasy", "commercial"] },
    { id: "realism", options: ["stylized", "semi-realistic", "photorealistic"] },
    { id: "brandPresence", options: ["none", "subtle", "prominent"] },
  ];
}

function enrich(kind: BriefWizardKind, answers: Record<string, string>): WizardConcept {
  if (kind === "character") {
    return enrichCharacterFromWizard(answers as StudioCharacterWizardAnswers);
  }
  if (kind === "location") {
    return enrichLocationFromWizard(answers as LocationWizardAnswers);
  }
  if (kind === "prop") {
    return enrichPropFromWizard(answers as PropWizardAnswers);
  }
  return enrichWorldFromWizard(answers as WorldWizardAnswers);
}

function defaultsForKind(kind: BriefWizardKind): Record<string, string> {
  if (kind === "character") return { ...CHARACTER_WIZARD_DEFAULTS };
  if (kind === "location") return { ...LOCATION_WIZARD_DEFAULTS };
  if (kind === "prop") return { ...PROP_WIZARD_DEFAULTS };
  return { ...WORLD_WIZARD_DEFAULTS };
}

export function StudioBriefAssetWizardPanel({ kind, onComplete, onCancel }: Props) {
  const t = useActiveTranslator();
  const questions = questionsForKind(kind);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(defaultsForKind(kind));
  const [concept, setConcept] = useState<WizardConcept | null>(null);

  const q = questions[step];
  if (!q) return null;

  if (concept) {
    return (
      <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4" data-testid={`studio-${kind}-wizard-result`}>
        <p className="text-sm font-semibold text-zinc-900">{concept.name}</p>
        <p className="text-xs text-zinc-600">
          {"description" in concept ? concept.description
          : "personality" in concept ? concept.personality
          : "atmosphere" in concept ? concept.atmosphere
          : ""}
        </p>
        <p className="text-xs font-medium text-amber-800">
          {t("studio.characterWizard.credits" as never, { credits: concept.estimatedCredits } as never)}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
            onClick={() => onComplete?.(concept)}
          >
            {t("studio.characterWizard.save" as never)}
          </button>
          {onCancel ?
            <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={onCancel}>
              {t("studio.productionBrief.back")}
            </button>
          : null}
        </div>
      </div>
    );
  }

  const i18nPrefix =
    kind === "character" ? "studio.characterWizard" : (`studio.${kind}Wizard` as const);

  return (
    <div className="space-y-3" data-testid={`studio-${kind}-wizard`}>
      <p className="text-xs font-semibold uppercase text-zinc-500">
        {t("studio.characterWizard.step" as never, { step: step + 1, total: 5 } as never)}
      </p>
      <p className="text-sm font-medium text-zinc-900">
        {t(`${i18nPrefix}.q.${q.id}` as never)}
      </p>
      <div className="flex flex-wrap gap-2">
        {q.options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              const next = { ...answers, [q.id]: opt };
              setAnswers(next);
              if (step >= 4) {
                setConcept(enrich(kind, next));
              } else {
                setStep(step + 1);
              }
            }}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-[#006D52]"
          >
            {t(`${i18nPrefix}.${q.id}.${opt}` as never)}
          </button>
        ))}
      </div>
    </div>
  );
}
