"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { AppCard } from "@/components/ui/app-card";
import {
  characterHasExplicitVoiceChoice,
  safeFormatLibraryVoiceProfileRef,
  safeFormatClonedVoiceProfileRef,
  isLibraryVoiceProfileRef,
  isClonedVoiceProfileRef,
} from "@/lib/studio-voice-profile-ref";
import { parseStructuredKeywordsFromVisualKeywords } from "@/lib/studio-character-visual-keywords";
import type {
  CharacterHealthView,
  CharacterSupportingReferenceRole,
} from "@/types/studio-character-canonical-references";
import type { StudioCharacterDetail } from "@/types/studio-api";

type Props = {
  character: StudioCharacterDetail;
  health: CharacterHealthView;
};

function statusBadgeClass(status: CharacterHealthView["status"]): string {
  return status === "ready"
    ? "bg-emerald-100 text-emerald-900"
    : "bg-amber-100 text-amber-950";
}

function supportingRoleKey(role: CharacterSupportingReferenceRole): TranslationKey {
  const map: Record<CharacterSupportingReferenceRole, TranslationKey> = {
    face: "studio.characterReferences.role.face",
    outfit: "studio.characters.imagePrefill.role.outfit",
    style: "studio.characterReferences.role.style",
    expression: "studio.characterReferences.role.expression",
  };
  return map[role];
}

function voiceSummary(character: StudioCharacterDetail, t: (key: TranslationKey) => string): string {
  if (!character.voiceEnabled) {
    return t("studio.characterHealth.voice.disabled");
  }
  if (!characterHasExplicitVoiceChoice(character.voiceProfile)) {
    return t("studio.characterHealth.voice.default");
  }
  if (isLibraryVoiceProfileRef(character.voiceProfile)) {
    return safeFormatLibraryVoiceProfileRef(character.voiceProfile) ?? character.voiceProfile;
  }
  if (isClonedVoiceProfileRef(character.voiceProfile)) {
    return safeFormatClonedVoiceProfileRef(character.voiceProfile) ?? character.voiceProfile;
  }
  return character.voiceProfile || t("studio.characterHealth.voice.linked");
}

export function StudioCharacterCanonicalOverviewPanel({ character, health }: Props) {
  const t = useActiveTranslator();
  const structured = parseStructuredKeywordsFromVisualKeywords(character.visualKeywords);
  const { references } = health;

  return (
    <div className="space-y-6">
      <AppCard className="space-y-4 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              {t("studio.characterHealth.title")}
            </h2>
            <p className="mt-1 text-xs text-zinc-600">{t("studio.characterHealth.lead")}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusBadgeClass(health.status)}`}
          >
            {health.status === "ready"
              ? t("studio.characterHealth.status.ready")
              : t("studio.characterHealth.status.needsAttention")}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["identityFilled", "studio.characterHealth.check.identity"],
              ["voiceLinked", "studio.characterHealth.check.voice"],
              ["worldLinked", "studio.characterHealth.check.world"],
              ["primaryReferencePresent", "studio.characterHealth.check.reference"],
            ] as const
          ).map(([key, labelKey]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs"
            >
              <span className="font-medium text-zinc-800">{t(labelKey)}</span>
              <span
                className={
                  health.checks[key]
                    ? "font-semibold text-emerald-700"
                    : "font-semibold text-amber-800"
                }
              >
                {health.checks[key]
                  ? t("studio.characterHealth.check.pass")
                  : t("studio.characterHealth.check.missing")}
              </span>
            </div>
          ))}
        </div>

        {health.warnings.length > 0 ? (
          <ul className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
            {health.warnings.map((warning) => (
              <li key={warning.id} className="text-xs text-amber-950">
                {t(warning.labelKey as TranslationKey)}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-xs text-zinc-500">
          {t("studio.characterHealth.score")}: {health.score}/100
        </p>
      </AppCard>

      <AppCard className="space-y-4 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">
          {t("studio.characterOverview.section.identity")}
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.characterReadiness.summary.type")}
            </dt>
            <dd className="mt-0.5 text-zinc-800">
              {structured.characterType || character.role || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.characterReadiness.summary.style")}
            </dt>
            <dd className="mt-0.5 text-zinc-800">{structured.visualStyle || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.characterOverview.field.colorTheme")}
            </dt>
            <dd className="mt-0.5 text-zinc-800">{structured.colorTheme || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.characterOverview.field.outfit")}
            </dt>
            <dd className="mt-0.5 text-zinc-800">{character.defaultClothing || "—"}</dd>
          </div>
        </dl>
      </AppCard>

      <AppCard className="space-y-3 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">
          {t("studio.characterOverview.section.voiceWorld")}
        </h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.characterReadiness.summary.voice")}
            </p>
            <p className="mt-0.5 text-zinc-800">{voiceSummary(character, t)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.characterReadiness.summary.world")}
            </p>
            <p className="mt-0.5 text-zinc-800">
              {character.worldProfile?.name ?? t("studio.characterHealth.warning.noWorld")}
            </p>
          </div>
        </div>
      </AppCard>

      <AppCard className="space-y-4 bg-white p-6">
        <h2 className="text-sm font-semibold text-zinc-900">
          {t("studio.characterReferences.title")}
        </h2>
        <p className="text-xs text-zinc-600">{t("studio.characterReferences.lead")}</p>

        {references.primary ? (
          <div className="overflow-hidden rounded-xl border-2 border-[#006D52]">
            <div className="flex items-center justify-between bg-[#006D52]/10 px-3 py-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[#006D52]">
                {t("studio.characterReferences.officialBadge")}
              </span>
              <span className="text-[10px] text-zinc-600">
                {t("studio.characterReferences.primaryLabel")}
              </span>
            </div>
            <div className="aspect-video bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={references.primary.imageUrl}
                alt={character.name}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-600">{t("studio.characterReferences.noPrimary")}</p>
        )}

        {references.supporting.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.characterReferences.supportingTitle")}
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {references.supporting.map((ref) => (
                <li key={ref.id} className="overflow-hidden rounded-lg border border-zinc-200">
                  <p className="bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-700">
                    {t(supportingRoleKey(ref.role))}
                  </p>
                  <div className="aspect-video bg-zinc-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ref.imageUrl} alt={ref.label || ref.role} className="h-full w-full object-contain" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {references.archive.length > 0 ? (
          <div className="space-y-2 border-t border-zinc-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.characterReferences.archiveTitle")}
            </h3>
            <ul className="space-y-2">
              {references.archive.map((ref) => (
                <li
                  key={ref.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/80 p-2"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ref.imageUrl} alt={ref.label} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 text-xs">
                    <p className="font-medium text-zinc-800">
                      {t("studio.characterReferences.archiveBadge")}
                      {ref.wasPrimary ? ` · ${t("studio.characterReferences.wasPrimary")}` : ""}
                    </p>
                    <p className="text-zinc-500">{ref.label}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </AppCard>

      {health.storyUsage ? (
        <AppCard className="space-y-2 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900">
            {t("studio.characterOverview.section.storyUsage")}
          </h2>
          <p className="text-sm text-zinc-700">
            {t("studio.characterOverview.storyUsage.summary", {
              scenes: health.storyUsage.sceneCount,
              storyboards: health.storyUsage.storyboardCount,
            })}
          </p>
          {health.storyUsage.storyboardIds.length > 0 ? (
            <ul className="flex flex-wrap gap-2 pt-1">
              {health.storyUsage.storyboardIds.map((storyboardId) => (
                <li key={storyboardId}>
                  <Link
                    href={`/studio/storyboards/${storyboardId}`}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-[#006D52] hover:underline"
                  >
                    {storyboardId.slice(0, 8)}…
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </AppCard>
      ) : null}
    </div>
  );
}
