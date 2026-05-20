"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  DEFAULT_POSTER_MOTION_SETTINGS,
  POSTER_MOTION_BLEND_MAX,
  resolvePosterMotionBlendStrength,
  type PosterMotionSettings,
} from "@/lib/poster-motion-preserve";

type Props = {
  settings: PosterMotionSettings;
  onChange: (patch: Partial<PosterMotionSettings>) => void;
};

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-amber-200/80 bg-white/90 px-3 py-2">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-xs">
        <span className="font-semibold text-zinc-900">{label}</span>
        {hint ? <span className="mt-0.5 block text-zinc-600">{hint}</span> : null}
      </span>
    </label>
  );
}

export function PosterMotionPanel({ settings, onChange }: Props) {
  const t = useActiveTranslator();
  const s = settings ?? DEFAULT_POSTER_MOTION_SETTINGS;

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/90 to-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-amber-950">{t("instant.posterMotion.title")}</h3>
      <p className="mt-1 text-xs leading-relaxed text-amber-900/85">{t("instant.posterMotion.intro")}</p>
      <p className="mt-2 rounded-lg border border-amber-300/60 bg-amber-100/50 px-2 py-1.5 text-[11px] font-medium text-amber-950">
        {t("instant.posterMotion.baseCanvasHint")}
      </p>

      <div className="mt-3">
        <label className="text-xs font-medium text-zinc-800">
          {t("instant.posterMotion.blendStrengthLabel")}
        </label>
        <input
          type="range"
          min={0.05}
          max={POSTER_MOTION_BLEND_MAX}
          step={0.01}
          value={s.posterMotionBlendStrength ?? resolvePosterMotionBlendStrength(s)}
          className="mt-1 w-full"
          onChange={(e) =>
            onChange({ posterMotionBlendStrength: Number.parseFloat(e.target.value) })
          }
        />
        <p className="mt-1 text-[11px] text-zinc-600">
          {t("instant.posterMotion.blendStrengthHint")}{" "}
          <span className="font-medium text-amber-950">
            {(s.posterMotionBlendStrength ?? resolvePosterMotionBlendStrength(s)).toFixed(2)}
          </span>
          {t("instant.posterMotion.blendStrengthMaxHint")}
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <ToggleRow
          label={t("instant.posterMotion.animateMascot")}
          checked={s.animateMascot}
          onChange={(v) => onChange({ animateMascot: v })}
        />
        <ToggleRow
          label={t("instant.posterMotion.animateProduct")}
          checked={s.animateProduct}
          onChange={(v) => onChange({ animateProduct: v })}
        />
        <ToggleRow
          label={t("instant.posterMotion.animateForegroundOnly")}
          hint={t("instant.posterMotion.animateForegroundOnlyHint")}
          checked={s.animateForegroundOnly}
          onChange={(v) => onChange({ animateForegroundOnly: v })}
        />
        <ToggleRow
          label={t("instant.posterMotion.preserveAllText")}
          hint={t("instant.posterMotion.preserveAllTextHint")}
          checked={s.preserveAllText}
          onChange={(v) =>
            onChange({
              preserveAllText: v,
              posterMotionBlendStrength: v ? 0.1 : 0.18,
            })
          }
        />
        <ToggleRow
          label={t("instant.posterMotion.cinematicCamera")}
          checked={s.cinematicCameraMotion}
          onChange={(v) => onChange({ cinematicCameraMotion: v })}
        />
        <ToggleRow
          label={t("instant.posterMotion.particlesGlow")}
          checked={s.particlesGlow}
          onChange={(v) => onChange({ particlesGlow: v })}
        />
        <ToggleRow
          label={t("instant.posterMotion.floatingObject")}
          checked={s.floatingGeneratedObject}
          onChange={(v) => onChange({ floatingGeneratedObject: v })}
        />
      </div>
    </div>
  );
}

export { DEFAULT_POSTER_MOTION_SETTINGS };
