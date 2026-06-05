"use client";

import { MotionExecutionPreview } from "@/components/instant/motion/motion-execution-preview";
import { MotionScoreBadge } from "@/components/instant/motion/motion-score-badge";
import { studioScenePresetLabel } from "@/lib/studio-scene-preset-label";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioSceneContextMetadata } from "@/types/studio-scene-context";
import { useState } from "react";

type Props = {
  context: StudioSceneContextMetadata;
  storyboardTitle?: string;
};

export function MotionSceneStudioInspector({ context, storyboardTitle }: Props) {
  const t = useActiveTranslator();
  const [open, setOpen] = useState(false);
  const [motionOpen, setMotionOpen] = useState(true);
  const qa = context.studioQa;
  const motion = context.studioMotionInstructions;

  const imageSourceLabel =
    context.imageSource === "studio"
      ? t("motion.handoff.context.imageSourceStudio")
      : context.imageSource === "manual"
        ? t("motion.handoff.context.imageSourceManual")
        : "—";

  const sceneLabel = context.studioQa?.sceneTitle ?? context.sceneId;

  return (
    <div className="mt-4 space-y-3">
      {context.sceneExecutionPackage ?
        <MotionExecutionPreview
          sceneLabel={sceneLabel}
          executionPackage={context.sceneExecutionPackage}
          executionPrompt={context.executionPrompt}
        />
      : null}
      {motion ?
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setMotionOpen((v) => !v)}
            aria-expanded={motionOpen}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
              {t("motion.handoff.motionInstructions.title")}
            </p>
            <span className="text-xs text-zinc-500">{motionOpen ? "▲" : "▼"}</span>
          </button>
          {motionOpen ?
            <div className="mt-2 space-y-2">
              <pre className="whitespace-pre-wrap rounded-lg bg-white/80 p-2 font-mono text-[11px] leading-relaxed text-zinc-800">
                {motion.text}
              </pre>
              {motion.usedFields.length > 0 ?
                <p className="text-[10px] text-emerald-800">
                  {t("motion.handoff.motionInstructions.used")}: {motion.usedFields.join(", ")}
                </p>
              : null}
              {motion.ignoredFields.length > 0 ?
                <p className="text-[10px] text-zinc-500">
                  {t("motion.handoff.motionInstructions.ignored")}: {motion.ignoredFields.join(", ")}
                </p>
              : null}
            </div>
          : null}
        </div>
      : null}
      {qa ?
        <div className="rounded-xl border border-violet-200/70 bg-violet-50/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-900">
            {t("motion.qa.inspector.studioMetadata")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <MotionScoreBadge label="Vision" score={qa.visionScore} />
            <MotionScoreBadge label="Cons." score={qa.consistencyScore} />
            {qa.combinedImageScore !== null ?
              <MotionScoreBadge label="Combined" score={qa.combinedImageScore} />
            : null}
          </div>
          {qa.characterIdentities.length > 0 ?
            <ul className="mt-2 space-y-1 text-xs text-zinc-800">
              {qa.characterIdentities.map((ch) => (
                <li key={ch.characterId} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{ch.name}</span>
                  <MotionScoreBadge label="ID" score={ch.score} status={ch.status} />
                </li>
              ))}
            </ul>
          : null}
          {qa.driftWarnings.length > 0 ?
            <ul className="mt-2 space-y-0.5 text-xs text-amber-900">
              {qa.driftWarnings.slice(0, 4).map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          : null}
          {qa.correctionRecommendations.length > 0 ?
            <p className="mt-2 text-[10px] text-zinc-500">
              {t("motion.qa.inspector.corrections", {
                count: String(qa.correctionRecommendations.length),
              })}
            </p>
          : null}
        </div>
      : null}

      <div className="rounded-2xl border border-[#0067B1]/25 bg-[#0067B1]/5">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="text-sm font-semibold text-[#0067B1]">
            {t("motion.handoff.context.title")}
            {storyboardTitle ?
              <span className="ml-2 font-normal text-zinc-600">({storyboardTitle})</span>
            : null}
          </span>
          <span className="text-xs text-zinc-500">{open ? "▲" : "▼"}</span>
        </button>
        {open ?
          <dl className="space-y-2 border-t border-[#0067B1]/15 px-4 py-3 text-sm">
            {[
              { label: t("motion.handoff.context.location"), value: context.location?.name ?? "—" },
              {
                label: t("motion.handoff.context.characters"),
                value: context.characters.map((c) => c.name).join(", ") || "—",
              },
              {
                label: t("motion.handoff.context.props"),
                value: context.props.map((p) => p.name).join(", ") || "—",
              },
              {
                label: t("motion.handoff.context.action"),
                value: studioScenePresetLabel(t, "action", context.action),
              },
              {
                label: t("motion.handoff.context.emotion"),
                value: studioScenePresetLabel(t, "emotion", context.emotion),
              },
              {
                label: t("motion.handoff.context.camera"),
                value: studioScenePresetLabel(t, "camera", context.camera),
              },
              {
                label: t("motion.handoff.context.selectedSceneImage"),
                value:
                  qa?.selectedSceneImageUrl ??
                  context.sceneImageReference?.imageUrl ??
                  context.preferredSceneImageUrl ??
                  "—",
              },
              { label: t("motion.handoff.context.imageSource"), value: imageSourceLabel },
            ].map((row) => (
              <div key={row.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {row.label}
                </dt>
                <dd className="mt-0.5 break-all text-zinc-800">{row.value}</dd>
              </div>
            ))}
          </dl>
        : null}
      </div>
    </div>
  );
}
