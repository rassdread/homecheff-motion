"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";

type Props = {
  titleKey: TranslationKey;
  issueKey?: TranslationKey;
  reasonKey?: TranslationKey;
  currentLabel: string;
  suggestedLabel: string;
  suggestedIsLabelKey?: boolean;
  canApply?: boolean;
  applyLabelKey?: TranslationKey;
  keepLabelKey?: TranslationKey;
  openLabelKey?: TranslationKey;
  onApply?: () => void;
  onOpen?: () => void;
};

function resolveLabel(value: string, isKey: boolean, t: (k: TranslationKey) => string): string {
  if (!value || value === "—") {
    return "—";
  }
  if (isKey && value.startsWith("studio.")) {
    return t(value as TranslationKey);
  }
  return value;
}

export function StudioAiSuggestionCard({
  titleKey,
  issueKey,
  reasonKey,
  currentLabel,
  suggestedLabel,
  suggestedIsLabelKey = false,
  canApply = false,
  applyLabelKey = "studio.execution.action.useSuggestion",
  keepLabelKey = "studio.execution.action.keepMine",
  openLabelKey = "studio.execution.action.open",
  onApply,
  onOpen,
}: Props) {
  const t = useActiveTranslator();
  const resolvedSuggested = resolveLabel(suggestedLabel, suggestedIsLabelKey, t);

  return (
    <article className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3">
      <h4 className="text-xs font-semibold text-zinc-900">{t(titleKey)}</h4>
      {issueKey ?
        <p className="mt-1 text-xs text-amber-900">⚠ {t(issueKey)}</p>
      : null}
      <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-zinc-500">{t("studio.execution.label.current")}</dt>
          <dd className="mt-0.5 text-zinc-800">{currentLabel || "—"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-500">{t("studio.execution.label.suggested")}</dt>
          <dd className="mt-0.5 font-medium text-[#0067B1]">{resolvedSuggested || "—"}</dd>
        </div>
      </dl>
      {reasonKey ?
        <p className="mt-2 text-[10px] text-zinc-600">{t(reasonKey)}</p>
      : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {canApply && onApply && resolvedSuggested !== "—" ?
          <button
            type="button"
            onClick={onApply}
            className="min-h-9 rounded-full bg-[#0067B1] px-3 text-[11px] font-semibold text-white"
          >
            {t(applyLabelKey)}
          </button>
        : null}
        {onOpen ?
          <button
            type="button"
            onClick={onOpen}
            className="min-h-9 rounded-full border border-zinc-200 bg-white px-3 text-[11px] font-semibold text-zinc-700"
          >
            {t(openLabelKey)}
          </button>
        : null}
      </div>
    </article>
  );
}

export function StudioFieldChangeRow({
  fieldKey,
  fromLabel,
  toLabel,
  sceneOrder,
}: {
  fieldKey: TranslationKey;
  fromLabel: string;
  toLabel: string;
  sceneOrder?: number;
}) {
  const t = useActiveTranslator();
  const fromResolved =
    fromLabel.startsWith("studio.") ? t(fromLabel as TranslationKey) : fromLabel;
  const toResolved = toLabel.startsWith("studio.") ? t(toLabel as TranslationKey) : toLabel;

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs">
      <p className="font-semibold text-zinc-800">
        {t(fieldKey)}
        {sceneOrder != null ? ` · ${t("studio.execution.label.sceneN", { n: String(sceneOrder) })}` : ""}
      </p>
      <p className="mt-1 text-zinc-600">
        {t("studio.execution.change.from")}: {fromResolved || "—"}
      </p>
      <p className="text-zinc-800">
        {t("studio.execution.change.to")}: {toResolved || "—"}
      </p>
    </div>
  );
}
