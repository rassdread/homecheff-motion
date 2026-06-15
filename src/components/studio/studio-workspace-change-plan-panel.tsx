"use client";

import { useMemo, useState } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  clearStudioAudioChangePlan,
  duplicateStudioAudioChangePlanItem,
  estimateStudioAudioChangePlanCredits,
  listPendingStudioAudioChangePlanItems,
  removeStudioAudioChangePlanItem,
  toggleStudioAudioChangePlanItemSelected,
  updateStudioAudioChangePlanItem,
} from "@/lib/studio-audio-change-plan";
import {
  applyAllStudioAudioChangePlan,
  applySelectedStudioAudioChangePlan,
} from "@/lib/studio-audio-change-plan-apply";
import { useStudioAudioChangePlan } from "@/hooks/use-studio-audio-change-plan";

type Props = {
  storyboardId: string;
  compact?: boolean;
};

function statusLabelKey(status: string): TranslationKey {
  if (status === "ready") return "studio.v9.changePlan.status.ready";
  if (status === "generating") return "studio.v9.changePlan.status.generating";
  if (status === "done") return "studio.v9.changePlan.status.done";
  if (status === "failed") return "studio.v9.changePlan.status.failed";
  return "studio.v9.changePlan.status.planned";
}

function kindLabelKey(kind: string): TranslationKey {
  if (kind === "music") return "studio.v9.changePlan.kind.music";
  if (kind === "sound_effect") return "studio.v9.changePlan.kind.sfx";
  return "studio.v9.changePlan.kind.voice";
}

export function StudioWorkspaceChangePlanPanel({ storyboardId, compact = false }: Props) {
  const t = useActiveTranslator();
  const { changePlan, setChangePlan } = useStudioAudioChangePlan(storyboardId);
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyError, setApplyError] = useState("");

  const pending = useMemo(
    () => listPendingStudioAudioChangePlanItems(changePlan),
    [changePlan]
  );
  const selectedCredits = useMemo(
    () =>
      estimateStudioAudioChangePlanCredits(
        changePlan.items.filter((item) => item.selected && item.status !== "done")
      ),
    [changePlan.items]
  );

  const handleApplySelected = async () => {
    setApplyBusy(true);
    setApplyError("");
    try {
      const result = await applySelectedStudioAudioChangePlan(changePlan, storyboardId);
      setChangePlan(result.plan);
      if (result.failedCount > 0) {
        setApplyError(t("studio.v9.changePlan.applyPartialError" as never));
      }
    } catch {
      setApplyError(t("studio.v9.changePlan.applyError" as never));
    } finally {
      setApplyBusy(false);
    }
  };

  const handleApplyAll = async () => {
    setApplyBusy(true);
    setApplyError("");
    try {
      const result = await applyAllStudioAudioChangePlan(changePlan, storyboardId);
      setChangePlan(result.plan);
    } catch {
      setApplyError(t("studio.v9.changePlan.applyError" as never));
    } finally {
      setApplyBusy(false);
    }
  };

  return (
    <section
      className={`rounded-2xl border border-[#006D52]/25 bg-white/95 ${compact ? "p-3" : "p-4"}`}
      data-testid="studio-change-plan-panel"
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#006D52]">
            {t("studio.v9.changePlan.label" as never)}
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-zinc-900">
            {t("studio.v9.changePlan.title" as never)}
          </h2>
          <p className="mt-1 text-xs text-zinc-600">
            {t("studio.v9.changePlan.subtitle" as never)}
          </p>
        </div>
        {changePlan.items.length > 0 ?
          <button
            type="button"
            className="shrink-0 text-xs text-zinc-600 underline hover:text-zinc-900"
            onClick={() => setChangePlan(clearStudioAudioChangePlan(changePlan))}
          >
            {t("studio.v9.changePlan.clear" as never)}
          </button>
        : null}
      </header>

      {changePlan.items.length === 0 ?
        <p className="mt-3 text-xs text-zinc-500">
          {t("studio.v9.changePlan.empty" as never)}
        </p>
      : (
        <ol className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {changePlan.items.map((item, index) => (
            <li
              key={item.id}
              className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm"
              data-testid={`studio-change-plan-item-${item.kind}`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={item.selected}
                  disabled={item.status === "done"}
                  onChange={() =>
                    setChangePlan(toggleStudioAudioChangePlanItemSelected(changePlan, item.id))
                  }
                  aria-label={t("studio.v9.changePlan.selectItem" as never)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {index + 1}. {t(kindLabelKey(item.kind) as never)} ·{" "}
                    {t(statusLabelKey(item.status) as never)}
                  </p>
                  <p className="mt-0.5 font-medium text-zinc-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-600">{item.instruction}</p>
                  {item.previewUrl || item.audioUrl ?
                    <div className="mt-2">
                      <StudioAudioPreviewPlayer
                        audioUrl={item.previewUrl ?? item.audioUrl}
                        title={item.title}
                        source="voice_library"
                      />
                    </div>
                  : null}
                  {item.errorMessage ?
                    <p className="mt-1 text-xs text-red-700">{item.errorMessage}</p>
                  : null}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                  onClick={() =>
                    setChangePlan(removeStudioAudioChangePlanItem(changePlan, item.id))
                  }
                >
                  {t("studio.v9.changePlan.remove" as never)}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                  onClick={() =>
                    setChangePlan(duplicateStudioAudioChangePlanItem(changePlan, item.id))
                  }
                >
                  {t("studio.v9.changePlan.regenerate" as never)}
                </button>
                {item.status === "planned" ?
                  <button
                    type="button"
                    className="rounded-md border border-[#006D52]/30 bg-[#006D52]/5 px-2 py-0.5 text-[11px] font-semibold text-[#006D52]"
                    onClick={() =>
                      setChangePlan(
                        updateStudioAudioChangePlanItem(changePlan, item.id, { status: "ready" })
                      )
                    }
                  >
                    {t("studio.v9.changePlan.approve" as never)}
                  </button>
                : null}
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
        {t("studio.v9.changePlan.costPlaceholder" as never, {
          credits: String(selectedCredits || pending.length),
        })}
      </div>

      {applyError ?
        <p className="mt-2 text-xs text-red-700">{applyError}</p>
      : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={applyBusy || pending.filter((i) => i.selected).length === 0}
          onClick={() => void handleApplySelected()}
          className="min-h-9 rounded-lg bg-[#006D52] px-3 text-xs font-semibold text-white disabled:opacity-50"
          data-testid="studio-change-plan-apply-selected"
        >
          {applyBusy
            ? t("studio.v9.changePlan.applying" as never)
            : t("studio.v9.changePlan.applySelected" as never)}
        </button>
        <button
          type="button"
          disabled={applyBusy || pending.length === 0}
          onClick={() => void handleApplyAll()}
          className="min-h-9 rounded-lg border border-[#006D52]/40 bg-white px-3 text-xs font-semibold text-[#006D52] disabled:opacity-50"
          data-testid="studio-change-plan-apply-all"
        >
          {t("studio.v9.changePlan.applyAll" as never)}
        </button>
      </div>
    </section>
  );
}
