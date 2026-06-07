"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  buildSceneIdentityConsumption,
  type IdentityConsumptionLibraries,
  type SceneIdentityConsumption,
} from "@/lib/studio-identity-consumption";
import type { StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
  libraries: IdentityConsumptionLibraries;
  consumption?: SceneIdentityConsumption;
};

const KIND_LABEL_KEYS: Record<string, TranslationKey> = {
  character: "studio.identityConsumption.kind.character",
  location: "studio.identityConsumption.kind.location",
  prop: "studio.identityConsumption.kind.prop",
  world: "studio.identityConsumption.kind.world",
};

export function StudioSceneIdentityConsumptionSummary({
  scene,
  libraries,
  consumption: consumptionProp,
}: Props) {
  const t = useActiveTranslator();

  const consumption = useMemo(
    () =>
      consumptionProp ??
      buildSceneIdentityConsumption({
        scene,
        libraries,
      }),
    [consumptionProp, scene, libraries]
  );

  if (consumption.assets.length === 0) {
    return null;
  }

  const worlds = consumption.assets.filter((a) => a.kind === "world");
  const characters = consumption.assets.filter((a) => a.kind === "character");
  const locations = consumption.assets.filter((a) => a.kind === "location");
  const props = consumption.assets.filter((a) => a.kind === "prop");

  const ruleLines = consumption.visualLines.slice(0, 4);

  return (
    <section className="rounded-2xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        {t("studio.identityConsumption.scene.title")}
      </h3>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {worlds.length > 0 ?
          <div className="rounded-lg bg-white/90 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.identityConsumption.kind.world")}
            </p>
            <p className="mt-0.5 text-xs text-zinc-800">
              {worlds.map((w) => w.name).join(", ")}
            </p>
          </div>
        : null}
        {characters.length > 0 ?
          <div className="rounded-lg bg-white/90 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.identityConsumption.kind.character")}
            </p>
            <p className="mt-0.5 text-xs text-zinc-800">
              {characters.map((c) => c.name).join(", ")}
            </p>
          </div>
        : null}
        {locations.length > 0 ?
          <div className="rounded-lg bg-white/90 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.identityConsumption.kind.location")}
            </p>
            <p className="mt-0.5 text-xs text-zinc-800">
              {locations.map((l) => l.name).join(", ")}
            </p>
          </div>
        : null}
        {props.length > 0 ?
          <div className="rounded-lg bg-white/90 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.identityConsumption.kind.prop")}
            </p>
            <p className="mt-0.5 text-xs text-zinc-800">
              {props.map((p) => p.name).join(", ")}
            </p>
          </div>
        : null}
      </div>

      {ruleLines.length > 0 ?
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.identityConsumption.scene.keyRules")}
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-zinc-600">
            {ruleLines.map((line) => (
              <li key={line} className="rounded bg-white/70 px-2 py-1">
                {line}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {consumption.rationales.length > 0 ?
        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.identityConsumption.whyRecommended")}
          </p>
          <ul className="space-y-1.5">
            {consumption.rationales.slice(0, 4).map((r) => (
              <li key={r.id} className="rounded-lg bg-white/90 px-3 py-2 text-xs text-zinc-700">
                <span className="font-medium text-[#0067B1]">
                  {t(KIND_LABEL_KEYS[r.sourceKind] ?? "studio.identityConsumption.kind.asset")}
                  {": "}
                  {r.sourceName}
                </span>
                <span className="mt-0.5 block text-zinc-600">
                  {t(r.reasonKey as TranslationKey, r.reasonParams)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      : null}
    </section>
  );
}
