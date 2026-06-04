"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { characterIdentityStatusColor } from "@/lib/studio-character-identity-status";
import { MotionScoreBadge } from "@/components/instant/motion/motion-score-badge";
import type { MotionRenderReadiness } from "@/types/motion-studio-intelligence";
import type { MotionStudioIntelligenceSnapshot } from "@/types/motion-studio-intelligence";

const TIMELINE_COLOR: Record<ReturnType<typeof characterIdentityStatusColor>, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  orange: "bg-orange-500",
  red: "bg-red-500",
  zinc: "bg-zinc-300",
};

const READINESS_CLASS: Record<MotionRenderReadiness["tier"], string> = {
  not_ready: "bg-red-100 text-red-900",
  needs_review: "bg-amber-100 text-amber-950",
  ready: "bg-[#006D52]/10 text-[#006D52]",
  strong: "bg-emerald-100 text-emerald-900",
};

type Props = {
  intelligence: MotionStudioIntelligenceSnapshot;
  readiness: MotionRenderReadiness;
};

export function MotionStudioIntelligencePanel({ intelligence, readiness }: Props) {
  const t = useActiveTranslator();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-violet-200/80 bg-violet-50/40">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-violet-950">
          {t("motion.qa.intelligence.title")}
        </span>
        <span className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${READINESS_CLASS[readiness.tier]}`}
          >
            {t(`motion.qa.readiness.tier.${readiness.tier}`)}
          </span>
          <span className="text-xs text-zinc-500">{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {open ?
        <div className="space-y-5 border-t border-violet-200/60 px-4 py-4">
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("motion.qa.source.title")}
            </h4>
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-zinc-500">{t("motion.qa.source.storyboard")}</dt>
                <dd className="font-medium text-zinc-900">{intelligence.storyboardTitle}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">{t("motion.qa.source.world")}</dt>
                <dd>{intelligence.worldName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">{t("motion.qa.source.characters")}</dt>
                <dd>{intelligence.charactersUsed.join(", ") || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">{t("motion.qa.source.locations")}</dt>
                <dd>{intelligence.locationsUsed.join(", ") || "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">{t("motion.qa.source.props")}</dt>
                <dd>{intelligence.propsUsed.join(", ") || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="flex flex-wrap gap-2">
            <MotionScoreBadge
              label={t("motion.qa.score.character")}
              score={intelligence.overallCharacterIdentityScore}
            />
            <MotionScoreBadge
              label={t("motion.qa.score.vision")}
              score={intelligence.overallVisionScore}
            />
            <MotionScoreBadge
              label={t("motion.qa.score.consistency")}
              score={intelligence.overallConsistencyScore}
            />
          </section>

          {intelligence.characterOverviews.length > 0 ?
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("motion.qa.characters.title")}
              </h4>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {intelligence.characterOverviews.map((ch) => (
                  <li
                    key={ch.characterId}
                    className="rounded-lg border border-white/80 bg-white/70 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-zinc-900">{ch.name}</span>
                    <p className="mt-0.5 text-xs text-zinc-600">
                      {t("motion.qa.characters.identityScore")}: {ch.identityScore ?? "—"}
                      {ch.status ?
                        ` · ${t(`studio.characterConsistency.status.${ch.status}`)}`
                      : null}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          : null}

          {intelligence.characterTimelines.length > 0 ?
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("motion.qa.timeline.title")}
              </h4>
              <div className="mt-2 space-y-3">
                {intelligence.characterTimelines.map((timeline) => (
                  <div key={timeline.characterId}>
                    <p className="text-sm font-medium text-zinc-900">{timeline.name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {timeline.entries.map((entry) => {
                        const color = characterIdentityStatusColor(entry.status);
                        return (
                          <div
                            key={entry.sceneId}
                            className="flex min-w-[3rem] flex-col items-center"
                            title={`${entry.sceneTitle}: ${entry.score ?? "—"}`}
                          >
                            <span
                              className={`h-7 w-7 rounded-md ${TIMELINE_COLOR[color]} ${entry.driftFlag ? "ring-2 ring-red-400" : ""}`}
                            />
                            <span className="text-[10px] text-zinc-600">{entry.order + 1}</span>
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
            </section>
          : null}

          {intelligence.driftWarnings.length > 0 ?
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                {t("motion.qa.drift.title")}
              </h4>
              <ul className="mt-2 space-y-2">
                {intelligence.driftWarnings.slice(0, 10).map((w) => (
                  <li
                    key={w.id}
                    className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950"
                  >
                    <span className="font-semibold uppercase">{w.severity}</span>
                    <span className="mx-1">·</span>
                    {w.message}
                    {w.affectedSceneOrders.length > 0 ?
                      <span className="mt-1 block text-amber-800">
                        {t("motion.qa.drift.scenes", {
                          scenes: w.affectedSceneOrders.map((o) => String(o + 1)).join(", "),
                        })}
                      </span>
                    : null}
                  </li>
                ))}
              </ul>
            </section>
          : null}

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("motion.qa.scenes.title")}
            </h4>
            <ul className="mt-2 space-y-3">
              {intelligence.sceneBreakdowns.map((scene) => (
                <li
                  key={scene.sceneId}
                  className="rounded-lg border border-white/80 bg-white/60 px-3 py-2 text-sm"
                >
                  <p className="font-semibold text-zinc-900">
                    {t("motion.qa.scenes.label", {
                      order: String(scene.order + 1),
                      title: scene.title,
                    })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <MotionScoreBadge label="Vision" score={scene.visionScore} />
                    <MotionScoreBadge label="Cons." score={scene.consistencyScore} />
                  </div>
                  {scene.characters.length > 0 ?
                    <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                      {scene.characters.map((ch) => (
                        <li key={ch.characterId}>
                          {ch.name} {ch.score}
                          {ch.driftFlag ? " ⚠" : ""}
                        </li>
                      ))}
                    </ul>
                  : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      : null}
    </div>
  );
}
