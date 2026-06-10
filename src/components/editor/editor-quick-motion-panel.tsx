"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { attachQuickMotionConfig, planQuickMotionExport } from "@/lib/editor-quick-gif";
import { EDITOR_QUICK_MOTION_PRESETS } from "@/types/homecheff-visual-editor";
import type { EditorCanvasDocument, EditorQuickMotionPreset } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
};

export function EditorQuickMotionPanel({ document, onDocumentChange }: Props) {
  const t = useActiveTranslator();
  const config = document.quickMotionConfig;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const updatePreset = (preset: EditorQuickMotionPreset) => {
    onDocumentChange(attachQuickMotionConfig(document, { preset }));
  };

  const handleExport = async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/editor/export/quick-motion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: document.sessionId, config: document.quickMotionConfig }),
      });
      const body = (await res.json()) as { ok?: boolean; job?: { frameCount: number; format: string } };
      if (body.ok && body.job) {
        setMessage(
          t("editor.v5.quickMotion.exportQueued" as never, {
            frames: String(body.job.frameCount),
            format: body.job.format.toUpperCase(),
          })
        );
      } else {
        setMessage(t("editor.v5.quickMotion.exportFailed" as never));
      }
    } catch {
      setMessage(t("editor.v5.quickMotion.exportFailed" as never));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
      <p className="text-sm font-semibold text-violet-900">{t("editor.v5.quickMotion.title" as never)}</p>
      <p className="mt-1 text-xs text-violet-800">{t("editor.v5.quickMotion.lead" as never)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {EDITOR_QUICK_MOTION_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => updatePreset(preset)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              config?.preset === preset
                ? "bg-violet-600 text-white"
                : "bg-white text-violet-800 border border-violet-200"
            }`}
          >
            {t(`editor.v5.quickMotion.preset.${preset}` as never)}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          {t("editor.v5.quickMotion.duration" as never)}
          <input
            type="number"
            min={0.5}
            max={10}
            step={0.5}
            value={config?.durationSec ?? 2}
            onChange={(e) =>
              onDocumentChange(attachQuickMotionConfig(document, { durationSec: Number(e.target.value) }))
            }
            className="rounded border border-violet-200 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          {t("editor.v5.quickMotion.format" as never)}
          <select
            value={config?.format ?? "gif"}
            onChange={(e) =>
              onDocumentChange(
                attachQuickMotionConfig(document, {
                  format: e.target.value as "gif" | "webp" | "mp4",
                })
              )
            }
            className="rounded border border-violet-200 px-2 py-1"
          >
            <option value="gif">GIF</option>
            <option value="webp">WebP</option>
            <option value="mp4">MP4</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleExport()}
        className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? t("editor.v5.quickMotion.generating" as never) : t("editor.v5.quickMotion.generate" as never)}
      </button>
      {message ? <p className="mt-2 text-xs text-violet-900">{message}</p> : null}
      <p className="mt-2 text-[11px] text-violet-700">
        {t("editor.v5.quickMotion.localPlan" as never, {
          frames: String(planQuickMotionExport(document).frameCount),
        })}
      </p>
    </div>
  );
}
