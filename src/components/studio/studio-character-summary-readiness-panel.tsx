"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  buildCharacterReadinessView,
  type CharacterReadinessDomain,
  type CharacterReadinessStatus,
  type CharacterReadinessView,
} from "@/lib/studio-character-readiness";
import type { CharacterIdentityFormValues, CharacterVoiceIdentityStatus } from "@/lib/studio-character-identity-fields";
import type { CharacterVoiceFormState } from "@/components/studio/studio-character-voice-center";
import type { StudioWorldProfileListItem } from "@/types/studio-api";

type Props = {
  mode: "create" | "edit";
  identity: CharacterIdentityFormValues;
  referenceImageUrl: string;
  voice: CharacterVoiceFormState;
  voiceStatus: CharacterVoiceIdentityStatus;
  worlds: StudioWorldProfileListItem[];
  showCreationPhases?: boolean;
};

function readinessBadgeClass(status: CharacterReadinessStatus): string {
  switch (status) {
    case "pass":
      return "bg-emerald-100 text-emerald-900";
    case "warning":
      return "bg-amber-100 text-amber-950";
    case "missing":
      return "bg-rose-100 text-rose-950";
  }
}

function readinessStatusKey(status: CharacterReadinessStatus): TranslationKey {
  switch (status) {
    case "pass":
      return "studio.insightsHub.health.status.pass";
    case "warning":
      return "studio.insightsHub.health.status.warning";
    case "missing":
      return "studio.insightsHub.health.status.missing";
  }
}

function phaseClass(status: CharacterReadinessView["creationPhases"][number]["status"]): string {
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "current") return "border-[#0067B1] bg-[#0067B1]/10 text-[#0067B1] font-semibold";
  return "border-zinc-200 bg-zinc-50 text-zinc-500";
}

function ReadinessRow({ domain }: { domain: CharacterReadinessDomain }) {
  const t = useActiveTranslator();
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg bg-white/90 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-900">{t(domain.labelKey as TranslationKey)}</p>
        {domain.detailKey ?
          <p className="text-[11px] text-zinc-600">{t(domain.detailKey as TranslationKey)}</p>
        : null}
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${readinessBadgeClass(domain.status)}`}
      >
        {t(readinessStatusKey(domain.status))}
      </span>
    </li>
  );
}

export function StudioCharacterSummaryReadinessPanel({
  mode,
  identity,
  referenceImageUrl,
  voice,
  voiceStatus,
  worlds,
  showCreationPhases = mode === "create",
}: Props) {
  const t = useActiveTranslator();
  const view = useMemo(
    () =>
      buildCharacterReadinessView({
        identity,
        referenceImageUrl,
        voiceEnabled: voice.voiceEnabled,
        voiceProfile: voice.voiceProfile,
        voiceStatus,
        worlds,
        mode,
      }),
    [identity, referenceImageUrl, voice, voiceStatus, worlds, mode]
  );

  const tierLabelKey =
    view.overallTier === "complete"
      ? "studio.characterIdentity.completeness.complete"
      : view.overallTier === "almost"
        ? "studio.characterIdentity.completeness.almost"
        : "studio.characterIdentity.completeness.missing";

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-5 shadow-sm">
      {showCreationPhases ?
        <ol className="flex flex-wrap gap-2">
          {view.creationPhases.map((phase) => (
            <li
              key={phase.id}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium ${phaseClass(phase.status)}`}
            >
              {t(phase.labelKey as TranslationKey)}
            </li>
          ))}
        </ol>
      : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-100 bg-white p-3 sm:col-span-2 lg:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.characterReadiness.summaryTitle")}
          </p>
          <p className="mt-1 text-lg font-bold text-zinc-900">{view.summary.name}</p>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-zinc-500">{t("studio.characterReadiness.summary.type")}</dt>
              <dd className="font-medium text-zinc-900">
                {view.summary.characterTypeKey
                  ? t(view.summary.characterTypeKey as TranslationKey)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">{t("studio.characterReadiness.summary.style")}</dt>
              <dd className="font-medium text-zinc-900">
                {view.summary.visualStyleKey ? t(view.summary.visualStyleKey as TranslationKey) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">{t("studio.characterReadiness.summary.voice")}</dt>
              <dd className="font-medium text-zinc-900">
                {t(view.summary.voiceSummaryKey as TranslationKey)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">{t("studio.characterReadiness.summary.world")}</dt>
              <dd className="font-medium text-zinc-900">{view.summary.worldName ?? "—"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-zinc-600">
            {t(tierLabelKey as TranslationKey)}
            <span className="ml-1 text-zinc-400">({view.overallScore}%)</span>
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#0067B1]/15 bg-[#0067B1]/5 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
          {t("studio.characterReadiness.nextStepTitle")}
        </p>
        <p className="mt-1 text-sm font-semibold text-zinc-900">
          {t(view.nextStepKey as TranslationKey)}
        </p>
        {view.nextStepDetailKey ?
          <p className="mt-0.5 text-xs text-zinc-600">{t(view.nextStepDetailKey as TranslationKey)}</p>
        : null}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
          {t("studio.characterReadiness.domainsTitle")}
        </h3>
        <ul className="mt-2 space-y-1.5">
          {view.domains.map((domain) => (
            <ReadinessRow key={domain.id} domain={domain} />
          ))}
        </ul>
      </div>

      {view.directorCompatibility.suitableKeys.length > 0 ?
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3">
          <p className="text-xs font-semibold text-violet-950">
            {t("studio.characterReadiness.compatTitle")}
          </p>
          <p className="mt-2 text-xs font-medium text-violet-900">
            {t("studio.characterReadiness.compatSuitable")}
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-violet-800">
            {view.directorCompatibility.suitableKeys.map((key) => (
              <li key={key}>✓ {t(key as TranslationKey)}</li>
            ))}
          </ul>
          {view.directorCompatibility.lessSuitableKeys.length > 0 ?
            <>
              <p className="mt-2 text-xs font-medium text-violet-900">
                {t("studio.characterReadiness.compatLessSuitable")}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-violet-700">
                {view.directorCompatibility.lessSuitableKeys.map((key) => (
                  <li key={key}>△ {t(key as TranslationKey)}</li>
                ))}
              </ul>
            </>
          : null}
        </div>
      : null}
    </section>
  );
}

export { buildCharacterReadinessView };
