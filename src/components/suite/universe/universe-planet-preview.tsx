"use client";

import type { UniversePlanetConfig } from "@/lib/universe-home-config";
import { useActiveTranslator } from "@/i18n/client";
import {
  UNIVERSE_PLANET_PREVIEW_PORTAL_CLASS,
  UNIVERSE_Z_PORTAL,
  resolveUniversePlanetPreviewContent,
  resolveUniversePortalBridgeClass,
  resolveUniversePortalPositionClass,
  type UniversePortalPlacement,
} from "@/lib/universe-planet-ux";

type UniversePlanetPreviewProps = {
  planet: UniversePlanetConfig;
  active: boolean;
  onOpen: () => void;
  onPortalEnter?: () => void;
  onPortalLeave?: () => void;
  placement?: UniversePortalPlacement;
  layout?: "floating" | "inline";
};

export function UniversePlanetPreview({
  planet,
  active,
  onOpen,
  onPortalEnter,
  onPortalLeave,
  placement = "below",
  layout = "floating",
}: UniversePlanetPreviewProps) {
  const t = useActiveTranslator();
  const content = resolveUniversePlanetPreviewContent(planet.id);

  const positionClass =
    layout === "inline" ? "relative w-full mt-4" : resolveUniversePortalPositionClass(placement);

  const bridgeClass = layout === "floating" ? resolveUniversePortalBridgeClass(placement) : "";

  const visibilityClass =
    layout === "inline"
      ? active
        ? "pointer-events-auto opacity-100"
        : "pointer-events-none hidden opacity-0"
      : active
        ? "pointer-events-auto scale-100 opacity-100"
        : "pointer-events-none scale-95 opacity-0";

  return (
    <>
      {layout === "floating" && active && (
        <div
          className={`absolute ${bridgeClass}`}
          style={{ zIndex: UNIVERSE_Z_PORTAL - 1 }}
          aria-hidden
          onMouseEnter={onPortalEnter}
          onMouseLeave={onPortalLeave}
        />
      )}
      <div
        className={`${UNIVERSE_PLANET_PREVIEW_PORTAL_CLASS} ${layout === "floating" ? "absolute w-[min(22rem,82vw)]" : "relative w-full"} transition-all duration-350 ${positionClass} ${visibilityClass}`}
        style={{
          zIndex: UNIVERSE_Z_PORTAL,
          transitionTimingFunction: "cubic-bezier(0.34, 1.15, 0.64, 1)",
        }}
        role="dialog"
        aria-hidden={!active}
        aria-label={t(content.titleKey)}
        onMouseEnter={onPortalEnter}
        onMouseLeave={onPortalLeave}
      >
        <div className="universe-glass overflow-hidden rounded-2xl p-5 sm:p-6">
          <div
            className="pointer-events-none absolute -inset-px rounded-2xl opacity-70"
            style={{
              background: `linear-gradient(135deg, ${planet.accent}55, transparent 50%, ${planet.accentSecondary ?? planet.accent}44)`,
            }}
            aria-hidden
          />

          <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            {t(planet.themeKey)}
          </p>
          <p className="relative mt-1 text-2xl font-bold text-white">{t(content.titleKey)}</p>
          <p className="relative mt-2 text-base leading-relaxed text-white/82">
            {t(content.descriptionKey)}
          </p>

          <dl className="relative mt-4 grid grid-cols-3 gap-2.5">
            {content.metrics.map((metric) => (
              <div
                key={metric.labelKey}
                className="rounded-xl border border-white/14 bg-white/10 px-2.5 py-2.5 text-center"
              >
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
                  {t(metric.labelKey)}
                </dt>
                <dd className="mt-1 text-sm font-bold text-white">{t(metric.sampleKey)}</dd>
              </div>
            ))}
          </dl>

          <div className="relative mt-3.5 flex gap-2">
            {content.previewChipKeys.map((chipKey, i) => (
              <div
                key={chipKey}
                className="flex min-h-[3rem] flex-1 flex-col items-center justify-center rounded-lg border border-white/16 px-2 py-2 text-center"
                style={{
                  background: `linear-gradient(145deg, ${planet.accent}${i === 0 ? "77" : "55"}, rgba(4,20,40,0.55))`,
                }}
              >
                <span className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-white/90 sm:text-xs">
                  {t(chipKey)}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpen}
            tabIndex={active ? 0 : -1}
            className="relative mt-5 w-full rounded-full py-3.5 text-base font-semibold text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            style={{
              background: `linear-gradient(135deg, ${planet.accent}, ${planet.accentSecondary ?? planet.accent})`,
            }}
          >
            {t(content.actionKey)}
          </button>
        </div>
      </div>
    </>
  );
}
