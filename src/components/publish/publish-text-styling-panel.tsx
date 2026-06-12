"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  applyTextTemplate,
  DEFAULT_PUBLISH_TEXT_STYLE,
  type PublishTextStylePreset,
  type PublishTextTemplate,
} from "@/lib/publish-text-styling";
import { PublishSafeZonePicker } from "@/components/publish/publish-safe-zone-picker";
import type { PublishSafeZoneId } from "@/lib/publish-safe-zone-v2";
import { applyTextRewrite, type PublishTextRewriteMode } from "@/lib/publish-change-plan";

type Props = {
  text: string;
  style: PublishTextStylePreset;
  safeZoneId?: PublishSafeZoneId;
  locked?: boolean;
  onTextChange: (text: string) => void;
  onStyleChange: (style: PublishTextStylePreset) => void;
  onSafeZoneChange?: (zone: PublishSafeZoneId) => void;
  onLockedChange?: (locked: boolean) => void;
};

const TEMPLATES: PublishTextTemplate[] = ["social", "commercial", "story", "quote", "cta"];
const REWRITE_MODES: PublishTextRewriteMode[] = ["improve", "shorten", "professional", "commercial"];

export function PublishTextStylingPanel({
  text,
  style,
  safeZoneId,
  locked,
  onTextChange,
  onStyleChange,
  onSafeZoneChange,
  onLockedChange,
}: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4" data-testid="publish-text-styling-panel">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t("publish.textStyle.title" as never)}</p>

      <textarea
        value={text}
        disabled={locked}
        onChange={(e) => onTextChange(e.target.value)}
        rows={3}
        className="hc-stable-field w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap gap-1">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl}
            type="button"
            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
            onClick={() => onStyleChange(applyTextTemplate(tpl))}
          >
            {t(`publish.textStyle.template.${tpl}` as never)}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs">
          {t("publish.textStyle.font" as never)}
          <select
            value={style.font}
            onChange={(e) => onStyleChange({ ...style, font: e.target.value as PublishTextStylePreset["font"] })}
            className="mt-1 w-full rounded border px-2 py-1"
          >
            {(["modern", "bold", "cinematic", "elegant", "clean"] as const).map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          {t("publish.textStyle.size" as never)}
          <select
            value={style.size}
            onChange={(e) => onStyleChange({ ...style, size: e.target.value as PublishTextStylePreset["size"] })}
            className="mt-1 w-full rounded border px-2 py-1"
          >
            {(["xs", "s", "m", "l", "xl"] as const).map((s) => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-1">
        {REWRITE_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={locked}
            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold disabled:opacity-40"
            onClick={() => onTextChange(applyTextRewrite(text, mode))}
          >
            {t(`publish.textStyle.rewrite.${mode}` as never)}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={Boolean(locked)} onChange={(e) => onLockedChange?.(e.target.checked)} />
        {t("publish.textStyle.lock" as never)}
      </label>

      {onSafeZoneChange ?
        <PublishSafeZonePicker selectedZone={safeZoneId} onSelectZone={onSafeZoneChange} />
      : null}

      <div
        className="relative mx-auto aspect-video max-h-32 overflow-hidden rounded-lg border border-zinc-300 bg-zinc-900"
        aria-label={t("publish.textStyle.preview" as never)}
      >
        <p
          className="absolute left-1/2 top-1/2 max-w-[80%] -translate-x-1/2 -translate-y-1/2 text-center font-semibold"
          style={{
            color: style.color === "custom" ? style.customColor : undefined,
            fontSize: style.size === "xl" ? 18 : style.size === "l" ? 16 : 14,
          }}
        >
          {text || t("publish.textStyle.previewPlaceholder" as never)}
        </p>
      </div>
    </div>
  );
}

export { DEFAULT_PUBLISH_TEXT_STYLE };
