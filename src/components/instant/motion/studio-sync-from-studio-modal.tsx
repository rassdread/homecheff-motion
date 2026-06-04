"use client";

import { useEffect, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  fetchStudioSyncPreview,
  postSyncFromStudio,
} from "@/lib/refresh-studio-intelligence-client";
import type { ProjectStudioQaResponse } from "@/types/studio-project-persistence";
import type { StudioMotionSyncApplyInput, StudioMotionSyncPreview } from "@/types/studio-motion-sync";

type Props = {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onApplied?: (qa: ProjectStudioQaResponse) => void;
  disabled?: boolean;
};

export function StudioSyncFromStudioModal({
  projectId,
  open,
  onClose,
  onApplied,
  disabled = false,
}: Props) {
  const t = useActiveTranslator();
  const [preview, setPreview] = useState<StudioMotionSyncPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<StudioMotionSyncApplyInput>({
    syncImages: false,
    syncTexts: false,
    syncEmotions: false,
    syncDurations: false,
    syncContext: true,
    confirmRemoveScenes: false,
    confirmAddScenes: false,
  });

  useEffect(() => {
    if (!open || !projectId) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      setLoading(true);
      setError(null);
      void (async () => {
        const res = await fetchStudioSyncPreview(projectId);
        if (cancelled) {
          return;
        }
        setLoading(false);
        const body = res.data;
        if (!res.ok || !body.ok) {
          setError(body && "error" in body ? body.error : t("motion.qa.sync.errorLoad"));
          setPreview(null);
          return;
        }
        setPreview(body.preview);
        setOptions({
          syncImages: body.preview.suggestedDefaults.syncImages,
          syncTexts: body.preview.suggestedDefaults.syncTexts,
          syncEmotions: body.preview.suggestedDefaults.syncEmotions,
          syncDurations: body.preview.suggestedDefaults.syncDurations,
          syncContext: body.preview.suggestedDefaults.syncContext,
          confirmRemoveScenes: false,
          confirmAddScenes: false,
        });
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, projectId, t]);

  const toggle = (key: keyof StudioMotionSyncApplyInput) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const apply = async (extra?: Partial<StudioMotionSyncApplyInput>) => {
    setApplyBusy(true);
    setError(null);
    const payload = { ...options, ...extra };
    const res = await postSyncFromStudio(projectId, payload);
    setApplyBusy(false);
    const body = res.data;
    if (!res.ok || !body.ok) {
      const fail = body as { ok: false; code?: string; error: string };
      if (fail.code === "SYNC_STUDIO_REMOVE_SCENES_CONFIRM") {
        setError(t("motion.qa.sync.confirmRemove"));
        return;
      }
      if (fail.code === "SYNC_STUDIO_ADD_SCENES_CONFIRM") {
        setError(t("motion.qa.sync.confirmAdd"));
        return;
      }
      setError(fail.error || t("motion.qa.sync.errorApply"));
      return;
    }
    if (body.studioQa) {
      onApplied?.(body.studioQa);
    }
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
        role="dialog"
        aria-labelledby="studio-sync-title"
      >
        <h2 id="studio-sync-title" className="text-lg font-semibold text-zinc-900">
          {t("motion.qa.sync.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("motion.qa.sync.subtitle")}</p>

        {loading ?
          <p className="mt-4 text-sm text-zinc-500">{t("motion.qa.sync.loading")}</p>
        : null}
        {error ?
          <p className="mt-4 text-sm text-red-700">{error}</p>
        : null}

        {preview ?
          <div className="mt-4 space-y-4">
            {preview.hasManualMotionEdits ?
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                {t("motion.qa.sync.manualEditsWarning")}
              </p>
            : null}
            {preview.warnings.map((w) => (
              <p key={w} className="text-xs text-amber-800">
                {w}
              </p>
            ))}
            {!preview.hasChanges ?
              <p className="text-sm text-zinc-600">{t("motion.qa.sync.noChanges")}</p>
            : null}

            <div className="space-y-2 text-sm">
              {(
                [
                  ["syncContext", "motion.qa.sync.optionContext"],
                  ["syncImages", "motion.qa.sync.optionImages"],
                  ["syncTexts", "motion.qa.sync.optionTexts"],
                  ["syncEmotions", "motion.qa.sync.optionEmotions"],
                  ["syncDurations", "motion.qa.sync.optionDurations"],
                ] as const
              ).map(([key, labelKey]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(options[key])}
                    onChange={() => toggle(key)}
                    disabled={disabled || applyBusy}
                  />
                  <span>{t(labelKey)}</span>
                </label>
              ))}
            </div>

            {preview.scenes.some((s) => s.imageChanged || s.titleChanged) ?
              <details className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-xs">
                <summary className="cursor-pointer font-semibold text-zinc-800">
                  {t("motion.qa.sync.sceneDetails")}
                </summary>
                <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                  {preview.scenes
                    .filter((s) => s.imageChanged || s.titleChanged || s.emotionChanged)
                    .map((s) => (
                      <li key={s.order}>
                        <span className="font-medium">Scene {s.order + 1}</span>
                        {s.imageChanged ?
                          <div>
                            {t("motion.qa.sync.imageChange")}: {s.currentMotionImageUrl ? "…" : "—"} →{" "}
                            {s.latestStudioImageUrl ? "Studio" : "—"}
                          </div>
                        : null}
                        {s.titleChanged ?
                          <div>
                            {t("motion.qa.sync.titleChange")}: {s.currentTitle || "—"} →{" "}
                            {s.latestStudioTitle}
                          </div>
                        : null}
                      </li>
                    ))}
                </ul>
              </details>
            : null}
          </div>
        : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
            onClick={onClose}
            disabled={applyBusy}
          >
            {t("motion.qa.sync.cancel")}
          </button>
          {preview?.requiresRemoveConfirmation ?
            <button
              type="button"
              disabled={disabled || applyBusy || loading}
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 disabled:opacity-60"
              onClick={() => void apply({ confirmRemoveScenes: true })}
            >
              {t("motion.qa.sync.applyWithRemove")}
            </button>
          : null}
          {preview?.requiresAddConfirmation ?
            <button
              type="button"
              disabled={disabled || applyBusy || loading}
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 disabled:opacity-60"
              onClick={() => void apply({ confirmAddScenes: true })}
            >
              {t("motion.qa.sync.applyWithAdd")}
            </button>
          : null}
          <button
            type="button"
            disabled={disabled || applyBusy || loading || !preview}
            className="rounded-lg bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() => void apply()}
          >
            {applyBusy ? t("motion.qa.sync.applying") : t("motion.qa.sync.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
