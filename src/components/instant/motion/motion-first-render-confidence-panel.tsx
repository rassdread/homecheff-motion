"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { MotionStudioIntelligenceSnapshot } from "@/types/motion-studio-intelligence";

type Props = {
  intelligence: MotionStudioIntelligenceSnapshot;
  sceneCount: number;
  voiceReady: boolean;
  textReady: boolean;
  charactersReady: boolean;
};

type Row = {
  key: "story" | "scenes" | "characters" | "voice" | "text";
  ready: boolean;
};

export function MotionFirstRenderConfidencePanel({
  intelligence,
  sceneCount,
  voiceReady,
  textReady,
  charactersReady,
}: Props) {
  const t = useActiveTranslator();

  const rows: Row[] = [
    { key: "story", ready: intelligence.sceneCount > 0 && Boolean(intelligence.storyboardTitle?.trim()) },
    { key: "scenes", ready: sceneCount > 0 },
    { key: "characters", ready: charactersReady },
    { key: "voice", ready: voiceReady },
    { key: "text", ready: textReady },
  ];

  const allReady = rows.every((r) => r.ready);

  return (
    <section className="rounded-2xl border border-[#006D52]/25 bg-gradient-to-br from-[#006D52]/5 to-white p-4">
      <h3 className="text-sm font-bold text-zinc-900">{t("motion.firstRender.title")}</h3>
      <p className="mt-1 text-xs text-zinc-600">{t("motion.firstRender.hint")}</p>
      <ul className="mt-4 space-y-2">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-3 text-sm text-zinc-800">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                row.ready ? "bg-[#006D52] text-white" : "bg-zinc-200 text-zinc-500"
              }`}
              aria-hidden
            >
              {row.ready ? "✓" : "○"}
            </span>
            <span>{t(`motion.firstRender.${row.key}`)}</span>
          </li>
        ))}
      </ul>
      <p
        className={`mt-4 rounded-xl px-3 py-2 text-center text-sm font-semibold ${
          allReady
            ? "bg-[#006D52]/10 text-[#006D52]"
            : "bg-amber-50 text-amber-900"
        }`}
      >
        {allReady ? t("motion.firstRender.ready") : t("motion.firstRender.almost")}
      </p>
    </section>
  );
}
