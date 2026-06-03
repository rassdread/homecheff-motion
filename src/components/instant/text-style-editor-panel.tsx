"use client";

import { useMemo, useState } from "react";
import type { InstantSceneTextDraft } from "@/components/instant/instant-mode-panel";
import { useActiveTranslator } from "@/i18n/client";
import {
  STORY_OVERLAY_STYLE_LAYERS,
  hasCustomOverlayLayerStyles,
  isLayerStyleCustomized,
  validateLayerStyleOverrides,
  type StoryOverlayAlignPreset,
  type StoryOverlayFontSizePreset,
  type StoryOverlayLayerStyleOverride,
  type StoryOverlayLayerStyles,
  type StoryOverlayOutlinePreset,
  type StoryOverlayPositionPreset,
  type StoryOverlayShadowPreset,
  type StoryOverlayStyleLayer,
} from "@/lib/story-overlay-layer-styles";

type Props = {
  overlayLayerStyles: StoryOverlayLayerStyles;
  onChange: (styles: StoryOverlayLayerStyles) => void;
  /** Rerender modals vs first-render wizard copy. */
  context?: "rerender" | "firstRender";
  /** Nested inside OptionalTextStyleSection — hide outer chrome. */
  embedded?: boolean;
};

const FONT_SIZE_OPTIONS: StoryOverlayFontSizePreset[] = ["smaller", "normal", "larger", "custom"];
const SHADOW_OPTIONS: StoryOverlayShadowPreset[] = ["none", "light", "medium", "strong"];
const OUTLINE_OPTIONS: StoryOverlayOutlinePreset[] = ["none", "light", "medium"];
const ALIGN_OPTIONS: StoryOverlayAlignPreset[] = ["left", "center", "right"];
const POSITION_OPTIONS: StoryOverlayPositionPreset[] = ["auto", "top", "middle", "bottom"];

function patchLayerStyles(
  styles: StoryOverlayLayerStyles,
  layer: StoryOverlayStyleLayer,
  patch: Partial<StoryOverlayLayerStyleOverride> | null
): StoryOverlayLayerStyles {
  const next = { ...styles };
  if (!patch) {
    delete next[layer];
    return next;
  }
  const merged = { ...next[layer], ...patch };
  delete merged.useAuto;
  next[layer] = merged;
  return next;
}

export function TextStyleEditorPanel({
  overlayLayerStyles,
  onChange,
  context = "rerender",
  embedded = false,
}: Props) {
  const t = useActiveTranslator();
  const [activeLayer, setActiveLayer] = useState<StoryOverlayStyleLayer>("headline");
  const override = overlayLayerStyles[activeLayer] ?? {};
  const warnings = useMemo(
    () => validateLayerStyleOverrides(overlayLayerStyles, 1920),
    [overlayLayerStyles]
  );
  const layerWarnings = warnings.filter((row) => row.layer === activeLayer);

  const update = (patch: Partial<StoryOverlayLayerStyleOverride>) => {
    onChange(patchLayerStyles(overlayLayerStyles, activeLayer, patch));
  };

  const resetLayer = () => {
    onChange(patchLayerStyles(overlayLayerStyles, activeLayer, null));
  };

  const resetAll = () => {
    onChange({});
  };

  const selectClass =
    "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900";
  const labelClass = "block text-xs text-zinc-500";

  return (
    <div
      className={
        embedded ? "pt-1"
        : "mt-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-3"
      }
    >
      {embedded ? null : (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-zinc-800">{t("instant.textStyle.title")}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {context === "firstRender"
                ? t("instant.textStyle.optionalHint")
                : t("instant.textStyle.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={resetAll}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-700"
          >
            {t("instant.textStyle.resetAll")}
          </button>
        </div>
      )}

      {embedded ?
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={resetAll}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-700"
          >
            {t("instant.textStyle.resetAll")}
          </button>
        </div>
      : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {STORY_OVERLAY_STYLE_LAYERS.map((layer) => {
          const customized = isLayerStyleCustomized(overlayLayerStyles[layer]);
          const selected = activeLayer === layer;
          return (
            <button
              key={layer}
              type="button"
              onClick={() => setActiveLayer(layer)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                selected ?
                  "border-emerald-500 bg-emerald-50 text-emerald-900"
                : customized ?
                  "border-amber-300 bg-amber-50 text-amber-900"
                : "border-zinc-200 bg-white text-zinc-700"
              }`}
            >
              {t(`instant.textStyle.layer.${layer}` as never)}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {t("instant.textStyle.fontSize")}
          <select
            value={override.fontSize ?? "normal"}
            onChange={(e) =>
              update({ fontSize: e.target.value as StoryOverlayFontSizePreset })
            }
            className={selectClass}
          >
            {FONT_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`instant.textStyle.fontSize.${option}` as never)}
              </option>
            ))}
          </select>
        </label>

        {override.fontSize === "custom" ?
          <label className={labelClass}>
            {t("instant.textStyle.fontSizeCustom")}
            <input
              type="number"
              min={18}
              max={160}
              value={override.fontSizeCustomPx ?? 48}
              onChange={(e) =>
                update({ fontSizeCustomPx: Number.parseInt(e.target.value, 10) || 48 })
              }
              className={selectClass}
            />
          </label>
        : null}

        <label className={labelClass}>
          {t("instant.textStyle.textColor")}
          <input
            type="color"
            value={override.textColor ?? "#ffffff"}
            onChange={(e) => update({ textColor: e.target.value })}
            className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-zinc-200 bg-white p-1"
          />
        </label>

        <label className={labelClass}>
          {t("instant.textStyle.backdrop")}
          <select
            value={
              override.backdropEnabled === false ? "off"
              : override.backdropEnabled === true ?
                "on"
              : "auto"
            }
            onChange={(e) => {
              const value = e.target.value;
              if (value === "auto") {
                update({ backdropEnabled: undefined });
                return;
              }
              update({ backdropEnabled: value === "on" });
            }}
            className={selectClass}
          >
            <option value="auto">{t("instant.textStyle.backdrop.auto")}</option>
            <option value="on">{t("instant.textStyle.backdrop.on")}</option>
            <option value="off">{t("instant.textStyle.backdrop.off")}</option>
          </select>
        </label>

        {override.backdropEnabled !== false ?
          <>
            <label className={labelClass}>
              {t("instant.textStyle.backdropOpacity")}
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((override.backdropOpacity ?? 0.55) * 100)}
                onChange={(e) =>
                  update({ backdropOpacity: Number.parseInt(e.target.value, 10) / 100 })
                }
                className="mt-2 w-full"
              />
            </label>
            <label className={labelClass}>
              {t("instant.textStyle.backdropColor")}
              <input
                type="color"
                value={override.backdropColor ?? "#000000"}
                onChange={(e) => update({ backdropColor: e.target.value })}
                className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-zinc-200 bg-white p-1"
              />
            </label>
          </>
        : null}

        <label className={labelClass}>
          {t("instant.textStyle.shadow")}
          <select
            value={override.shadow ?? "auto"}
            onChange={(e) => {
              const value = e.target.value;
              update({ shadow: value === "auto" ? undefined : (value as StoryOverlayShadowPreset) });
            }}
            className={selectClass}
          >
            <option value="auto">{t("instant.textStyle.auto")}</option>
            {SHADOW_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`instant.textStyle.shadow.${option}` as never)}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          {t("instant.textStyle.outline")}
          <select
            value={override.outline ?? "auto"}
            onChange={(e) => {
              const value = e.target.value;
              update({ outline: value === "auto" ? undefined : (value as StoryOverlayOutlinePreset) });
            }}
            className={selectClass}
          >
            <option value="auto">{t("instant.textStyle.auto")}</option>
            {OUTLINE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`instant.textStyle.outline.${option}` as never)}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          {t("instant.textStyle.alignment")}
          <select
            value={override.alignment ?? "auto"}
            onChange={(e) => {
              const value = e.target.value;
              update({
                alignment: value === "auto" ? undefined : (value as StoryOverlayAlignPreset),
              });
            }}
            className={selectClass}
          >
            <option value="auto">{t("instant.textStyle.auto")}</option>
            {ALIGN_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`instant.textStyle.alignment.${option}` as never)}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          {t("instant.textStyle.position")}
          <select
            value={override.position ?? "auto"}
            onChange={(e) =>
              update({ position: e.target.value as StoryOverlayPositionPreset })
            }
            className={selectClass}
          >
            {POSITION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`instant.textStyle.position.${option}` as never)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {layerWarnings.length > 0 ?
        <ul className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          {layerWarnings.map((warning) => (
            <li key={warning.code}>{warning.message}</li>
          ))}
        </ul>
      : null}

      <button
        type="button"
        onClick={resetLayer}
        className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700"
      >
        {t("instant.textStyle.resetToAuto")}
      </button>
    </div>
  );
}

export type TextStyleEditorSceneProps = {
  scene: InstantSceneTextDraft;
  onSceneChange: (patch: Partial<InstantSceneTextDraft>) => void;
  context?: "rerender" | "firstRender";
  embedded?: boolean;
};

export function TextStyleEditorForScene({
  scene,
  onSceneChange,
  context = "rerender",
  embedded = false,
}: TextStyleEditorSceneProps) {
  return (
    <TextStyleEditorPanel
      overlayLayerStyles={scene.overlayLayerStyles}
      onChange={(overlayLayerStyles) => onSceneChange({ overlayLayerStyles })}
      context={context}
      embedded={embedded}
    />
  );
}

/** Collapsed optional section for first-render storyboard. */
export function OptionalTextStyleSection({
  scene,
  onSceneChange,
}: TextStyleEditorSceneProps) {
  const t = useActiveTranslator();
  const [expanded, setExpanded] = useState(false);
  const customized = hasCustomOverlayLayerStyles(scene.overlayLayerStyles);

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/60">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-3 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-800">
            {t("instant.textStyle.optionalTitle")}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
            {t("instant.textStyle.optionalHint")}
          </p>
        </div>
        {customized ?
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
            {t("instant.textStyle.customizedBadge")}
          </span>
        : null}
        <span className="shrink-0 text-xs text-zinc-400">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded ?
        <div className="border-t border-zinc-200 px-3 pb-3">
          <TextStyleEditorForScene
            scene={scene}
            onSceneChange={onSceneChange}
            context="firstRender"
            embedded
          />
        </div>
      : null}
    </div>
  );
}
