"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  pickBestSafeZone,
  resolvePublishOrientation,
  resolveSafeZoneRect,
  resolveSafeZonesForOrientation,
  scoreSafeZones,
  type PublishSafeZoneId,
} from "@/lib/publish-safe-zone-v2";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  aspectRatio?: number;
  selectedZone?: PublishSafeZoneId;
  occupiedZones?: PublishSafeZoneId[];
  onSelectZone: (zone: PublishSafeZoneId) => void;
};

export function PublishSafeZonePicker({
  aspectRatio = 9 / 16,
  selectedZone,
  occupiedZones = [],
  onSelectZone,
}: Props) {
  const t = useActiveTranslator();
  const orientation = resolvePublishOrientation(aspectRatio);
  const zones = resolveSafeZonesForOrientation(orientation);
  const heatmap = scoreSafeZones({ orientation, occupiedZones });
  const best = pickBestSafeZone(heatmap);

  return (
    <div className="space-y-2" data-testid="publish-safe-zone-picker">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {t("publish.safeZone.title" as never)}
      </p>
      <div
        className="relative mx-auto aspect-[9/16] max-h-64 w-full max-w-[180px] overflow-hidden rounded-xl border border-zinc-300 bg-zinc-900 sm:aspect-video sm:max-h-none sm:max-w-xs"
        style={{ aspectRatio: orientation === "portrait" ? "9/16" : "16/9" }}
      >
        {zones.map((zone) => {
          const rect = resolveSafeZoneRect(zone, orientation);
          const score = heatmap[zone] ?? 0;
          const active = selectedZone === zone;
          return (
            <button
              key={zone}
              type="button"
              title={zone.replace(/_/g, " ")}
              onClick={() => onSelectZone(zone)}
              className={`absolute border text-[8px] font-medium uppercase transition ${
                active ? "border-emerald-400 bg-emerald-500/30 text-white"
                : score > 0 ? "border-white/20 bg-white/5 text-white/70 hover:bg-white/15"
                : "border-red-400/40 bg-red-500/10 text-red-200"
              }`}
              style={{
                left: `${rect.x * 100}%`,
                top: `${rect.y * 100}%`,
                width: `${rect.width * 100}%`,
                height: `${rect.height * 100}%`,
              }}
            />
          );
        })}
      </div>
      {best.needsManual ?
        <p className="text-xs text-amber-700">{t("publish.safeZone.manual" as never)}</p>
      : null}
    </div>
  );
}
