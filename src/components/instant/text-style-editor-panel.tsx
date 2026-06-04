"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { InstantSceneTextDraft } from "@/components/instant/instant-mode-panel";
import { InstantWizardToast } from "@/components/instant/instant-wizard-toast";
import { useActiveTranslator } from "@/i18n/client";
import {
  STORY_OVERLAY_STYLE_LAYERS,
  clearOverlayLayerStyles,
  hasCustomOverlayLayerStyles,
  isLayerStyleCustomized,
  patchOverlayLayerStyles,
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
import {
  buildAutomaticStyleSummaryLines,
  layerTextStyleBadge,
  summaryFieldLabelKey,
} from "@/lib/text-style-editor-ux";

type PanelProps = {
  overlayLayerStyles: StoryOverlayLayerStyles;
  onChange: (styles: StoryOverlayLayerStyles) => void;
  context?: "rerender" | "firstRender";
  embedded?: boolean;
  onLayerReset?: () => void;
};

const FONT_SIZE_OPTIONS: StoryOverlayFontSizePreset[] = ["smaller", "normal", "larger", "custom"];
const SHADOW_OPTIONS: StoryOverlayShadowPreset[] = ["none", "light", "medium", "strong"];
const OUTLINE_OPTIONS: StoryOverlayOutlinePreset[] = ["none", "light", "medium"];
const ALIGN_OPTIONS: StoryOverlayAlignPreset[] = ["left", "center", "right"];
const POSITION_OPTIONS: StoryOverlayPositionPreset[] = ["auto", "top", "middle", "bottom"];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";

function AutomaticStyleSummary() {
  const t = useActiveTranslator();
  const lines = buildAutomaticStyleSummaryLines();

  return (
    <div
      className="mt-2 rounded-lg border border-zinc-100 bg-white/80 px-3 py-2.5"
      aria-label={t("instant.textStyle.summary.active")}
    >
      <p className="text-[11px] font-medium text-emerald-800">{t("instant.textStyle.summary.active")}</p>
      <dl className="mt-2 space-y-1">
        {lines.map((line) => (
          <div key={line.field} className="flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-[11px]">
            <dt className="text-zinc-500">{t(summaryFieldLabelKey(line.field) as never)}</dt>
            <dd className="font-medium text-zinc-800">{t(line.valueKey as never)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type LayerControlsProps = {
  layer: StoryOverlayStyleLayer;
  override: StoryOverlayLayerStyleOverride;
  warnings: ReturnType<typeof validateLayerStyleOverrides>;
  onUpdate: (patch: Partial<StoryOverlayLayerStyleOverride>) => void;
  onReset: () => void;
};

function TextStyleLayerControls({ layer, override, warnings, onUpdate, onReset }: LayerControlsProps) {
  const t = useActiveTranslator();
  const layerWarnings = warnings.filter((row) => row.layer === layer);
  const selectClass =
    "mt-1 w-full max-w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900";
  const labelClass = "block text-xs text-zinc-500";

  return (
    <div className="max-w-full overflow-x-hidden pb-1">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {t("instant.textStyle.fontSize")}
          <select
            value={override.fontSize ?? "normal"}
            onChange={(e) =>
              onUpdate({ fontSize: e.target.value as StoryOverlayFontSizePreset })
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
                onUpdate({ fontSizeCustomPx: Number.parseInt(e.target.value, 10) || 48 })
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
            onChange={(e) => onUpdate({ textColor: e.target.value })}
            className="mt-1 h-10 w-full max-w-full cursor-pointer rounded-lg border border-zinc-200 bg-white p-1"
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
                onUpdate({ backdropEnabled: undefined });
                return;
              }
              onUpdate({ backdropEnabled: value === "on" });
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
                  onUpdate({ backdropOpacity: Number.parseInt(e.target.value, 10) / 100 })
                }
                className="mt-2 w-full max-w-full"
              />
            </label>
            <label className={labelClass}>
              {t("instant.textStyle.backdropColor")}
              <input
                type="color"
                value={override.backdropColor ?? "#000000"}
                onChange={(e) => onUpdate({ backdropColor: e.target.value })}
                className="mt-1 h-10 w-full max-w-full cursor-pointer rounded-lg border border-zinc-200 bg-white p-1"
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
              onUpdate({ shadow: value === "auto" ? undefined : (value as StoryOverlayShadowPreset) });
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
              onUpdate({ outline: value === "auto" ? undefined : (value as StoryOverlayOutlinePreset) });
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
              onUpdate({
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
              onUpdate({ position: e.target.value as StoryOverlayPositionPreset })
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
        <ul
          className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900"
          role="status"
        >
          {layerWarnings.map((warning) => (
            <li key={warning.code}>{warning.message}</li>
          ))}
        </ul>
      : null}

      <button
        type="button"
        onClick={onReset}
        className={`mt-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 sm:w-auto ${focusRing}`}
      >
        {t("instant.textStyle.resetLayer")}
      </button>
    </div>
  );
}

export function TextStyleEditorPanel({
  overlayLayerStyles,
  onChange,
  context = "rerender",
  embedded = false,
  onLayerReset,
}: PanelProps) {
  const t = useActiveTranslator();
  const baseId = useId();
  const [expandedLayer, setExpandedLayer] = useState<StoryOverlayStyleLayer | null>(null);
  const warnings = useMemo(
    () => validateLayerStyleOverrides(overlayLayerStyles, 1920),
    [overlayLayerStyles]
  );

  const toggleLayer = (layer: StoryOverlayStyleLayer) => {
    setExpandedLayer((current) => (current === layer ? null : layer));
  };

  const updateLayer = (layer: StoryOverlayStyleLayer, patch: Partial<StoryOverlayLayerStyleOverride>) => {
    onChange(patchOverlayLayerStyles(overlayLayerStyles, layer, patch));
  };

  const resetLayer = (layer: StoryOverlayStyleLayer) => {
    if (!isLayerStyleCustomized(overlayLayerStyles[layer])) {
      return;
    }
    onChange(patchOverlayLayerStyles(overlayLayerStyles, layer, null));
    onLayerReset?.();
  };

  const resetAll = () => {
    onChange(clearOverlayLayerStyles());
    setExpandedLayer(null);
  };

  return (
    <div
      className={
        embedded ? "max-w-full overflow-x-hidden pt-1"
        : "mt-3 max-w-full overflow-x-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-3"
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
            className={`rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-700 ${focusRing}`}
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
            className={`rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-700 ${focusRing}`}
          >
            {t("instant.textStyle.resetAll")}
          </button>
        </div>
      : null}

      <div className="mt-2 space-y-1.5" role="group" aria-label={t("instant.textStyle.layersGroup")}>
        {STORY_OVERLAY_STYLE_LAYERS.map((layer) => {
          const badge = layerTextStyleBadge(overlayLayerStyles[layer]);
          const open = expandedLayer === layer;
          const panelId = `${baseId}-layer-${layer}`;
          const override = overlayLayerStyles[layer] ?? {};

          return (
            <div
              key={layer}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
            >
              <button
                type="button"
                id={`${panelId}-trigger`}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggleLayer(layer)}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-zinc-800 ${focusRing}`}
              >
                <span className="shrink-0 text-zinc-400" aria-hidden>
                  {open ? "▲" : "▼"}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {t(`instant.textStyle.layer.${layer}` as never)}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    badge === "custom" ?
                      "bg-amber-100 text-amber-900"
                    : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {badge === "custom"
                    ? t("instant.textStyle.layerBadge.custom")
                    : t("instant.textStyle.layerBadge.automatic")}
                </span>
              </button>
              {open ?
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={`${panelId}-trigger`}
                  className="max-h-[min(70vh,32rem)] overflow-y-auto overflow-x-hidden border-t border-zinc-100 px-3 py-3"
                >
                  <TextStyleLayerControls
                    layer={layer}
                    override={override}
                    warnings={warnings}
                    onUpdate={(patch) => updateLayer(layer, patch)}
                    onReset={() => resetLayer(layer)}
                  />
                </div>
              : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type TextStyleEditorSceneProps = {
  scene: InstantSceneTextDraft;
  onSceneChange: (patch: Partial<InstantSceneTextDraft>) => void;
  context?: "rerender" | "firstRender";
  embedded?: boolean;
  onLayerReset?: () => void;
};

export function TextStyleEditorForScene({
  scene,
  onSceneChange,
  context = "rerender",
  embedded = false,
  onLayerReset,
}: TextStyleEditorSceneProps) {
  return (
    <TextStyleEditorPanel
      overlayLayerStyles={scene.overlayLayerStyles}
      onChange={(overlayLayerStyles) => onSceneChange({ overlayLayerStyles })}
      context={context}
      embedded={embedded}
      onLayerReset={onLayerReset}
    />
  );
}

/** Collapsed-by-default optional text styling (wizard + rerender editors). */
export function OptionalTextStyleSection({
  scene,
  onSceneChange,
  context = "firstRender",
}: TextStyleEditorSceneProps) {
  const t = useActiveTranslator();
  const [expanded, setExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const sectionCustomized = hasCustomOverlayLayerStyles(scene.overlayLayerStyles);

  const showLayerResetToast = useCallback(() => {
    setToastMessage(t("instant.textStyle.resetLayerToast"));
  }, [t]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  return (
    <div className="mt-3 max-w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/60">
      <div className="px-3 py-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            className={`min-w-0 flex-1 text-left ${focusRing} rounded-lg`}
          >
            <p className="text-xs font-semibold text-zinc-800">
              <span className="mr-1.5 text-zinc-400" aria-hidden>
                {expanded ? "▲" : "▼"}
              </span>
              {t("instant.textStyle.optionalTitle")}
            </p>
          </button>
          {sectionCustomized ?
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
              {t("instant.textStyle.customizedBadge")}
            </span>
          : null}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{t("instant.textStyle.optionalHint")}</p>

        {!expanded ?
          <>
            <AutomaticStyleSummary />
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className={`mt-3 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 sm:w-auto ${focusRing}`}
            >
              {t("instant.textStyle.openAdvanced")}
            </button>
          </>
        : null}
      </div>

      {expanded ?
        <div className="max-w-full overflow-x-hidden border-t border-zinc-200 px-3 pb-3">
          <TextStyleEditorForScene
            scene={scene}
            onSceneChange={onSceneChange}
            context={context}
            embedded
            onLayerReset={showLayerResetToast}
          />
        </div>
      : null}

      <InstantWizardToast message={toastMessage} />
    </div>
  );
}
