"use client";

import { useMemo, useState } from "react";
import { VideoPreview } from "@/components/ui/video-preview";
import { useActiveTranslator } from "@/i18n/client";
import { versionCenterStatusLabelKey } from "@/lib/version-center-tabs";
import type { VersionCenterRow } from "@/lib/version-center-tabs";

type Props = {
  rows: VersionCenterRow[];
};

export function VersionCenterComparePanel({ rows }: Props) {
  const t = useActiveTranslator();
  const comparable = useMemo(
    () => rows.filter((r) => r.videoUrl || r.renderVersionId),
    [rows]
  );

  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");

  const left = comparable.find((r) => r.id === leftId) ?? comparable[0] ?? null;
  const right =
    comparable.find((r) => r.id === rightId) ??
    comparable.find((r) => r.id !== left?.id) ??
    null;

  if (comparable.length < 2) {
    return null;
  }

  const diffHint = (() => {
    if (!left || !right) {
      return t("versions.center.compare.pickTwo");
    }
    if (left.tab !== right.tab) {
      return t("versions.center.compare.typeChanged", {
        from: t(`versions.center.tab.${left.tab}` as never),
        to: t(`versions.center.tab.${right.tab}` as never),
      });
    }
    if (left.title !== right.title) {
      return t("versions.center.compare.textChanged");
    }
    return t("versions.center.compare.sameType");
  })();

  return (
    <section className="mb-6 rounded-2xl border border-[#0067B1]/20 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-bold text-zinc-900">{t("versions.center.compare.title")}</h2>
      <p className="mt-1 text-xs text-zinc-600">{t("versions.center.compare.subtitle")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-zinc-700">
          {t("versions.center.compare.left")}
          <select
            className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={left?.id ?? ""}
            onChange={(e) => setLeftId(e.target.value)}
          >
            {comparable.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-700">
          {t("versions.center.compare.right")}
          <select
            className="mt-1 w-full min-h-[44px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={right?.id ?? ""}
            onChange={(e) => setRightId(e.target.value)}
          >
            {comparable.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-950">{diffHint}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[left, right].map((row, index) =>
          row ?
            <div key={row.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-900">{row.title}</p>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-700">
                  {t(versionCenterStatusLabelKey(row.status) as never)}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">
                {t(`versions.center.tab.${row.tab}` as never)}
              </p>
              <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-100">
                {row.videoUrl ?
                  <VideoPreview src={row.videoUrl} className="h-full w-full object-cover" />
                : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                    {t("versions.center.noPreview")}
                  </div>
                )}
              </div>
            </div>
          : (
            <div key={index} />
          )
        )}
      </div>
    </section>
  );
}
