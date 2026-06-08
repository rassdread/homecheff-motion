"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { CharacterIdentityFormValues } from "@/lib/studio-character-identity-fields";
import { conflictMessageKey } from "@/lib/studio-character-identity-prefill-merge";
import type { CharacterIdentityPrefillResult } from "@/types/studio-character-identity-prefill";

type Props = {
  result: CharacterIdentityPrefillResult;
  proposalApplied: boolean;
  onApplyProposal: () => void;
  onAdjust: () => void;
};

function reviewFieldKey(field: string): TranslationKey {
  return `studio.characterIdentity.fields.${field}` as TranslationKey;
}

const REVIEW_FIELDS: Array<keyof CharacterIdentityFormValues> = [
  "characterType",
  "visualStyle",
  "shapeLanguage",
  "energy",
  "clothing",
  "accessories",
  "colorTheme",
  "personality",
  "usageContext",
  "forbiddenElements",
];

export function StudioCharacterPrefillReviewCard({
  result,
  proposalApplied,
  onApplyProposal,
  onAdjust,
}: Props) {
  const t = useActiveTranslator();

  const formatReviewValue = (field: keyof CharacterIdentityFormValues, value: string) => {
    if (!value.trim()) {
      return "—";
    }
    if (field === "characterType") {
      const key = `studio.characterIdentity.types.${value}` as TranslationKey;
      const label = t(key);
      return label === key ? value : label;
    }
    if (field === "visualStyle") {
      const key = `studio.characterIdentity.styles.${value}` as TranslationKey;
      const label = t(key);
      return label === key ? value : label;
    }
    if (field === "shapeLanguage") {
      const key = `studio.characterIdentity.shapes.${value}` as TranslationKey;
      const label = t(key);
      return label === key ? value.replace(/_/g, " ") : label;
    }
    if (field === "energy") {
      const key = `studio.characterIdentity.energies.${value}` as TranslationKey;
      const label = t(key);
      return label === key ? value.replace(/_/g, " ") : label;
    }
    if (field === "colorTheme") {
      const key = `studio.characterIdentity.presets.color.${value}` as TranslationKey;
      const label = t(key);
      return label === key ? value : label;
    }
    return value;
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <p className="text-sm font-semibold text-emerald-950">
        {t("studio.characters.prefill.proposalTitle")}
      </p>
      <p className="mt-1 text-xs text-emerald-900">
        {t("studio.characters.prefill.confidence", {
          percent: String(Math.round(result.confidence * 100)),
        })}
      </p>

      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {REVIEW_FIELDS.map((field) => (
          <div key={field} className="rounded-lg bg-white/80 px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t(reviewFieldKey(field))}
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-900">
              {formatReviewValue(field, String(result.prefill[field] ?? ""))}
            </dd>
          </div>
        ))}
      </dl>

      {result.prefill.name ?
        <p className="mt-2 text-xs text-emerald-900">
          <span className="font-semibold">{t(reviewFieldKey("name"))}:</span> {result.prefill.name}
        </p>
      : null}

      {result.voiceDirectionHint ?
        <p className="mt-2 text-xs text-emerald-900">
          <span className="font-semibold">{t("studio.characters.prefill.voiceDirection")}:</span>{" "}
          {result.voiceDirectionHint}
        </p>
      : null}

      {result.voiceAccentHint ?
        <p className="mt-1 text-xs text-emerald-800">
          <span className="font-semibold">{t("studio.characters.prefill.voiceAccent")}:</span>{" "}
          {result.voiceAccentHint}
        </p>
      : null}

      {(result.conflicts ?? []).length > 0 ?
        <ul className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {(result.conflicts ?? []).map((conflict) => (
            <li key={conflict.field}>
              {t(conflictMessageKey(conflict.field) as TranslationKey)}
            </li>
          ))}
        </ul>
      : null}

      {result.safetyNotes.length > 0 ?
        <ul className="mt-2 list-disc pl-4 text-xs text-amber-900">
          {result.safetyNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      : null}

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
        {t("studio.characters.prefill.brandDisclaimer")}
      </p>

      {!proposalApplied ?
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApplyProposal}
            className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {t("studio.characters.prefill.useProposal")}
          </button>
          <button
            type="button"
            onClick={onAdjust}
            className="rounded-full border border-emerald-300 bg-white px-5 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
          >
            {t("studio.characters.prefill.adjustFirst")}
          </button>
        </div>
      : <p className="mt-3 text-xs font-semibold text-emerald-800">
          {t("studio.characters.prefill.proposalApplied")}
        </p>
      }
    </div>
  );
}
