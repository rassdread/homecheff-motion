"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  DEFAULT_OVERLAY_STYLE,
  DEFAULT_TEXT_RENDER_MODE,
  OVERLAY_STYLES,
  TEXT_RENDER_MODES,
  type OverlayStyle,
  type TextRenderMode,
} from "@/lib/hybrid-motion-overlay";

type Props = {
  textRenderMode: TextRenderMode;
  overlayStyle: OverlayStyle;
  onTextRenderModeChange: (mode: TextRenderMode) => void;
  onOverlayStyleChange: (style: OverlayStyle) => void;
};

const MODE_LABEL_KEYS: Record<TextRenderMode, string> = {
  deevid_text_safe: "instant.textIntegration.mode.deevid",
  hybrid_overlay: "instant.textIntegration.mode.hybrid",
  ai_protection: "instant.textIntegration.mode.aiProtection",
  exact_freeze: "instant.textIntegration.mode.exactFreeze",
  none: "instant.textIntegration.mode.none",
};

const STYLE_LABEL_KEYS: Record<OverlayStyle, string> = {
  exact: "instant.textIntegration.style.exact",
  cinematic: "instant.textIntegration.style.cinematic",
  "social-ui": "instant.textIntegration.style.socialUi",
  floating: "instant.textIntegration.style.floating",
  "soft-glow": "instant.textIntegration.style.softGlow",
  kinetic: "instant.textIntegration.style.kinetic",
};

export function TextIntegrationPanel({
  textRenderMode,
  overlayStyle,
  onTextRenderModeChange,
  onOverlayStyleChange,
}: Props) {
  const t = useActiveTranslator();

  return (
    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
      <h3 className="text-sm font-semibold text-emerald-950">{t("instant.textIntegration.title")}</h3>
      <p className="mt-1 text-xs text-emerald-900/80">{t("instant.textIntegration.intro")}</p>

      <fieldset className="mt-3">
        <legend className="text-xs font-medium text-zinc-700">{t("instant.textIntegration.modeLabel")}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {TEXT_RENDER_MODES.map((mode) => (
            <label
              key={mode}
              className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                textRenderMode === mode
                  ? "border-emerald-500 bg-white shadow-sm"
                  : "border-zinc-200 bg-white/70"
              }`}
            >
              <input
                type="radio"
                name="textRenderMode"
                className="mt-0.5"
                checked={textRenderMode === mode}
                onChange={() => onTextRenderModeChange(mode)}
              />
              <span>
                <span className="font-semibold text-zinc-900">{t(MODE_LABEL_KEYS[mode] as never)}</span>
                <span className="mt-0.5 block text-zinc-600">
                  {t(`instant.textIntegration.modeDesc.${mode}` as never)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {(textRenderMode === "deevid_text_safe" ||
        textRenderMode === "hybrid_overlay" ||
        textRenderMode === "exact_freeze") && (
        <div className="mt-3">
          <label htmlFor="overlay-style" className="text-xs font-medium text-zinc-700">
            {t("instant.textIntegration.styleLabel")}
          </label>
          <select
            id="overlay-style"
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            value={overlayStyle}
            onChange={(e) => onOverlayStyleChange(e.target.value as OverlayStyle)}
          >
            {OVERLAY_STYLES.map((style) => (
              <option key={style} value={style}>
                {t(STYLE_LABEL_KEYS[style] as never)}
              </option>
            ))}
          </select>
        </div>
      )}

      {textRenderMode === DEFAULT_TEXT_RENDER_MODE ? (
        <p className="mt-2 text-[11px] text-emerald-800">{t("instant.textIntegration.recommended")}</p>
      ) : null}
    </div>
  );
}

export { DEFAULT_TEXT_RENDER_MODE, DEFAULT_OVERLAY_STYLE };
