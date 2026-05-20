"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { ManualForegroundRegion } from "@/lib/premium-foreground-segmentation";
import type { ForegroundSegmentRole } from "@/lib/premium-foreground-segmentation";

const MANUAL_ROLES: ForegroundSegmentRole[] = [
  "foreground_mascot",
  "foreground_character",
  "foreground_prop",
  "foreground_hand",
  "phone",
  "ui_card",
  "logo",
  "text",
];

type Props = {
  regions: ManualForegroundRegion[];
  onChange: (regions: ManualForegroundRegion[]) => void;
};

function newRegion(): ManualForegroundRegion {
  return {
    id: `manual-${Date.now()}`,
    role: "foreground_mascot",
    regionKind: "animated",
    bbox: { x: 0.2, y: 0.25, width: 0.6, height: 0.5 },
    featherPx: 4,
  };
}

export function ManualForegroundRegionsPanel({ regions, onChange }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="mt-3 rounded-xl border border-zinc-200 bg-white/80 p-3">
      <p className="text-xs font-medium text-zinc-800">{t("instant.foreground.manualTitle")}</p>
      <p className="mt-0.5 text-[11px] text-zinc-600">{t("instant.foreground.manualHint")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-violet-300 bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-950"
          onClick={() => onChange([...regions, newRegion()])}
        >
          {t("instant.foreground.addRegion")}
        </button>
        {regions.length > 0 ? (
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] text-zinc-600"
            onClick={() => onChange([])}
          >
            {t("instant.foreground.clearRegions")}
          </button>
        ) : null}
      </div>
      {regions.map((region, index) => (
        <div key={region.id} className="mt-2 rounded-lg border border-zinc-100 bg-zinc-50/80 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px]">
              <span className="text-zinc-600">{t("instant.foreground.role")}</span>
              <select
                className="ml-1 rounded border border-zinc-200 px-1 py-0.5"
                value={region.role}
                onChange={(e) => {
                  const next = [...regions];
                  next[index] = {
                    ...region,
                    role: e.target.value as ForegroundSegmentRole,
                    regionKind:
                      e.target.value === "text" || e.target.value === "logo"
                        ? "static_preserved"
                        : region.regionKind,
                  };
                  onChange(next);
                }}
              >
                {MANUAL_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="text-[11px] text-red-600"
              onClick={() => onChange(regions.filter((r) => r.id !== region.id))}
            >
              {t("instant.foreground.removeRegion")}
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["x", "y", "width", "height"] as const).map((key) => (
              <label key={key} className="text-[10px] text-zinc-600">
                {key}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  className="mt-0.5 w-full"
                  value={region.bbox[key]}
                  onChange={(e) => {
                    const next = [...regions];
                    next[index] = {
                      ...region,
                      bbox: { ...region.bbox, [key]: Number(e.target.value) },
                    };
                    onChange(next);
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
