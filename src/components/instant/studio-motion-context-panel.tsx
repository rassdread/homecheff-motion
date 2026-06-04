"use client";

import { useState } from "react";
import { studioScenePresetLabel } from "@/lib/studio-scene-preset-label";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioSceneContextMetadata } from "@/types/studio-scene-context";

type StudioMotionContextPanelProps = {
  context: StudioSceneContextMetadata;
  storyboardTitle?: string;
};

export function StudioMotionContextPanel({
  context,
  storyboardTitle,
}: StudioMotionContextPanelProps) {
  const t = useActiveTranslator();
  const [open, setOpen] = useState(false);

  const rows: Array<{ label: string; value: string }> = [
    {
      label: t("motion.handoff.context.location"),
      value: context.location?.name ?? "—",
    },
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
  ];

  return (
    <div className="mt-4 rounded-2xl border border-[#0067B1]/25 bg-[#0067B1]/5">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-[#0067B1]">
          {t("motion.handoff.context.title")}
          {storyboardTitle ? (
            <span className="ml-2 font-normal text-zinc-600">({storyboardTitle})</span>
          ) : null}
        </span>
        <span className="text-xs text-zinc-500">{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <dl className="space-y-2 border-t border-[#0067B1]/15 px-4 py-3 text-sm">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {row.label}
              </dt>
              <dd className="mt-0.5 text-zinc-800">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
