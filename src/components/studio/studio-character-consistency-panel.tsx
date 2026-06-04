"use client";

import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { characterIdentityStatusColor } from "@/lib/studio-character-identity-status";
import type { StoryboardCharacterConsistencyReport } from "@/types/studio-character-consistency";

const COLOR_CLASS: Record<ReturnType<typeof characterIdentityStatusColor>, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  orange: "bg-orange-500",
  red: "bg-red-500",
  zinc: "bg-zinc-300",
};

type Props = {
  report: StoryboardCharacterConsistencyReport | null;
  loading?: boolean;
};

export function StudioCharacterConsistencyPanel({ report, loading }: Props) {
  const t = useActiveTranslator();

  if (loading) {
    return (
      <AppCard className="p-5">
        <p className="text-sm text-zinc-500">{t("studio.characterConsistency.loading")}</p>
      </AppCard>
    );
  }

  if (!report) {
    return (
      <AppCard className="p-5">
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.characterConsistency.title")}
        </h2>
        <p className="mt-2 text-sm text-zinc-500">{t("studio.characterConsistency.notAnalyzed")}</p>
      </AppCard>
    );
  }

  return (
    <AppCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.characterConsistency.title")}
        </h2>
        <span className="text-sm font-semibold text-[#006D52]">
          {t("studio.characterConsistency.overall")}: {report.overallCharacterConsistencyScore}
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">{t("studio.characterConsistency.subtitle")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {report.characterTimelines.map((timeline) => (
          <div
            key={timeline.characterId}
            className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-900">{timeline.name}</p>
                <p className="text-xs text-zinc-500">
                  {t("studio.characterConsistency.avgScore")}:{" "}
                  {timeline.averageScore ?? "—"}
                  {timeline.worstSceneOrder !== null ?
                    ` · ${t("studio.characterConsistency.worstScene", {
                      scene: String(timeline.worstSceneOrder + 1),
                      score: String(timeline.worstScore ?? "—"),
                    })}`
                  : null}
                </p>
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-600">
                {t("studio.characterConsistency.warnings", { count: timeline.warningCount })}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {timeline.entries.map((entry) => {
                const color = characterIdentityStatusColor(entry.status);
                return (
                  <div
                    key={entry.sceneId}
                    className="flex min-w-[3.5rem] flex-col items-center gap-1"
                    title={
                      entry.score !== null
                        ? `${entry.sceneTitle}: ${entry.score}`
                        : entry.sceneTitle
                    }
                  >
                    <span
                      className={`h-8 w-8 rounded-lg ${COLOR_CLASS[color]} ${
                        entry.driftFlag ? "ring-2 ring-red-400 ring-offset-1" : ""
                      }`}
                    />
                    <span className="text-[10px] font-medium text-zinc-600">
                      {entry.order + 1}
                    </span>
                    <span className="text-[10px] tabular-nums text-zinc-500">
                      {entry.score ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {report.driftWarnings.length > 0 ?
        <ul className="mt-4 space-y-1 text-xs text-amber-900">
          {report.driftWarnings.slice(0, 8).map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      : null}
    </AppCard>
  );
}
