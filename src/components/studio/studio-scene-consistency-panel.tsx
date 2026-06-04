"use client";

import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import type { SceneConsistencyReport } from "@/types/studio-consistency";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

type StudioSceneConsistencyPanelProps = {
  image: StudioSceneImageListItem | null;
  report: SceneConsistencyReport | null;
};

function statusColor(status: string | null | undefined): string {
  switch (status) {
    case "excellent":
      return "text-emerald-700 bg-emerald-50";
    case "good":
      return "text-[#006D52] bg-[#006D52]/10";
    case "needs_review":
      return "text-amber-800 bg-amber-50";
    case "poor":
      return "text-red-800 bg-red-50";
    default:
      return "text-zinc-600 bg-zinc-100";
  }
}

export function StudioSceneConsistencyPanel({ image, report }: StudioSceneConsistencyPanelProps) {
  const t = useActiveTranslator();

  if (!image || image.status !== "completed") {
    return (
      <p className="text-sm text-zinc-500">{t("studio.consistency.noCompletedImage")}</p>
    );
  }

  if (!report) {
    return (
      <p className="text-sm text-zinc-500">{t("studio.consistency.notAnalyzedYet")}</p>
    );
  }

  const status = report.consistencyStatus;
  const a = report.analysis;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${statusColor(status)}`}
        >
          {t(`studio.consistency.status.${status}`)} · {report.overallScore}
        </span>
        <span className="text-xs text-zinc-500">
          {t("studio.consistency.analyzedAt")}:{" "}
          {new Date(report.analyzedAt).toLocaleString()}
        </span>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.consistency.score.character")}
          </dt>
          <dd className="mt-1 text-2xl font-bold text-zinc-900">{a.characterScore}</dd>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.consistency.score.location")}
          </dt>
          <dd className="mt-1 text-2xl font-bold text-zinc-900">{a.locationScore}</dd>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.consistency.score.prop")}
          </dt>
          <dd className="mt-1 text-2xl font-bold text-zinc-900">{a.propScore}</dd>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.consistency.score.world")}
          </dt>
          <dd className="mt-1 text-2xl font-bold text-zinc-900">{a.worldScore}</dd>
        </div>
      </dl>

      {report.warnings.length > 0 ? (
        <AppCard className="border-amber-200 bg-amber-50/50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">
            {t("studio.consistency.warnings")}
          </h3>
          <ul className="mt-2 list-inside list-disc text-sm text-amber-950">
            {report.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </AppCard>
      ) : null}

      {a.driftWarnings.length > 0 ? (
        <AppCard className="border-orange-200 bg-orange-50/40 p-4">
          <h3 className="text-sm font-semibold text-orange-900">
            {t("studio.consistency.driftWarnings")}
          </h3>
          <ul className="mt-2 list-inside list-disc text-sm text-orange-950">
            {a.driftWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </AppCard>
      ) : null}

      {report.recommendations.length > 0 ? (
        <AppCard className="p-4">
          <h3 className="text-sm font-semibold text-zinc-800">
            {t("studio.consistency.recommendations")}
          </h3>
          <ul className="mt-2 list-inside list-disc text-sm text-zinc-700">
            {report.recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </AppCard>
      ) : null}

      <AppCard className="p-4">
        <h3 className="text-sm font-semibold text-zinc-800">
          {t("studio.consistency.memoryReferences")}
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-zinc-700">
          {report.memoryReferences.characters.map((c) => (
            <li key={c.id}>
              {t("studio.consistency.ref.character")}: {c.name}
            </li>
          ))}
          {report.memoryReferences.location ? (
            <li>
              {t("studio.consistency.ref.location")}: {report.memoryReferences.location.name}
            </li>
          ) : null}
          {report.memoryReferences.props.map((p) => (
            <li key={p.id}>
              {t("studio.consistency.ref.prop")}: {p.name}
            </li>
          ))}
          {report.memoryReferences.world ? (
            <li>
              {t("studio.consistency.ref.world")}: {report.memoryReferences.world.name}
            </li>
          ) : null}
        </ul>
        <p className="mt-3 text-xs text-zinc-500">{t("studio.consistency.methodHint")}</p>
      </AppCard>
    </div>
  );
}
